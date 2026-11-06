import { themes, type Link, type Project, type Theme } from './catalog.ts';

/**
 * The portfolio as an arithmetic code. Every node owns a slice of [0, 1): its
 * children split it in proportion to a measure, so a node's width is its
 * probability and reaching it costs −log₂ of that many bits.
 *
 * A place (the root, a theme or a project) is a message that can end, so like
 * any arithmetic code over variable-length messages its last child is an end
 * symbol: the slice that means "stop here". A place's codeword is the shortest
 * binary fraction whose dyadic interval fits inside that slice, which makes
 * codewords unique and decodable by reading bits until the slice is known.
 */

export type Measure = 'emphasis' | 'effort';
export type Span = { readonly lo: number; readonly hi: number };

/**
 * The page itself is the root's top slice, [1 − 2^−PAGE_BITS, 1), and holds the
 * whole root again. Being dyadic, every codeword inside it is PAGE_CODE followed
 * by a codeword of the root, so each repetition of PAGE_CODE is one level deeper.
 */
export const PAGE_BITS = 4;
export const PAGE_CODE = '1'.repeat(PAGE_BITS);

/** Shares of a place's slice given to its end symbol, before its other children split the rest. */
const END_SHARE = { root: .06, theme: .1, project: .5 };

interface NodeBase {
  /** Preorder index, unique within the tree. */
  readonly id: number;
  readonly parent: Node | null;
  readonly spans: Readonly<Record<Measure, Span>>;
  readonly children: readonly Node[];
}
export interface RootNode extends NodeBase { readonly kind: 'root' }
export interface ThemeNode extends NodeBase { readonly kind: 'theme'; readonly theme: Theme }
export interface ProjectNode extends NodeBase { readonly kind: 'project'; readonly project: Project; readonly theme: Theme }
export interface LinkNode extends NodeBase { readonly kind: 'link'; readonly link: Link }
/** Its parent's own slice: where a message that stops at the parent ends. */
export interface EndNode extends NodeBase { readonly kind: 'end' }
/** This page. Its children are the root's, one recursion level deeper, so it stores none. */
export interface PageNode extends NodeBase { readonly kind: 'page' }

export type Node = RootNode | ThemeNode | ProjectNode | LinkNode | EndNode | PageNode;
export type Place = RootNode | ThemeNode | ProjectNode;

/** A place at a recursion level: level n is inside the page n times. */
export type Focus = { readonly place: Place; readonly level: number };

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
type Fields = DistributiveOmit<Node, keyof NodeBase>;
type Child = { weight: Record<Measure, number>; fields: Fields; grow?: (node: Node) => void };

let nextId = 0;

/**
 * Splits `region` among `children` by each measure's weights and builds them
 * under `parent`, top down: the first child gets the top of the interval, as
 * the view draws probability rising upward and reads from the top.
 */
function adopt(parent: Node, region: Record<Measure, Span>, children: Child[]): void {
  const spans = children.map(() => ({}) as Record<Measure, Span>);
  for (const measure of ['emphasis', 'effort'] as const) {
    const { lo, hi } = region[measure];
    const total = children.reduce((sum, child) => sum + child.weight[measure], 0);
    let cumulative = 0;
    children.forEach((child, i) => {
      const top = hi - (hi - lo) * cumulative / total;
      cumulative += child.weight[measure];
      // The last boundary is the parent's own, exactly, so siblings tile it with no gap.
      spans[i]![measure] = { lo: i === children.length - 1 ? lo : hi - (hi - lo) * cumulative / total, hi: top };
    });
  }
  children.forEach((child, i) => {
    const node = { ...child.fields, id: nextId++, parent, spans: spans[i]!, children: [] } as Node;
    (parent.children as Node[]).push(node);
    child.grow?.(node);
  });
}

/** `rest` splitting the slice by weight, after an end symbol takes `share` of it at the bottom. */
function withEnd(share: number, rest: Child[]): Child[] {
  const end = (weight: number): Child => ({ weight: { emphasis: weight, effort: weight }, fields: { kind: 'end' } });
  if (rest.length === 0) return [end(1)];
  const totals = { emphasis: 0, effort: 0 };
  for (const child of rest) {
    totals.emphasis += child.weight.emphasis;
    totals.effort += child.weight.effort;
  }
  return [
    ...rest.map(child => ({
      ...child,
      weight: {
        emphasis: (1 - share) * child.weight.emphasis / totals.emphasis,
        effort: (1 - share) * child.weight.effort / totals.effort
      }
    })),
    end(share)
  ];
}

/** Private repositories have no public count; one commit keeps them codable. */
const effortOf = (project: Project) => Math.max(1, project.commits ?? 0);

const both = (span: Span): Record<Measure, Span> => ({ emphasis: span, effort: span });

function projectChild(project: Project, theme: Theme): Child {
  return {
    weight: { emphasis: project.emphasis, effort: effortOf(project) },
    fields: { kind: 'project', project, theme },
    grow: node => adopt(node, node.spans, withEnd(END_SHARE.project, project.links.map(link => ({
      weight: { emphasis: 1, effort: 1 },
      fields: { kind: 'link', link }
    }))))
  };
}

function themeChild(theme: Theme): Child {
  return {
    weight: { emphasis: theme.emphasis, effort: theme.projects.reduce((sum, p) => sum + effortOf(p), 0) },
    fields: { kind: 'theme', theme },
    grow: node => adopt(node, node.spans, withEnd(END_SHARE.theme, theme.projects.map(p => projectChild(p, theme))))
  };
}

function build(): RootNode {
  const root: RootNode = { kind: 'root', id: nextId++, parent: null, spans: both({ lo: 0, hi: 1 }), children: [] };
  const pageLo = 1 - 2 ** -PAGE_BITS;
  adopt(root, both({ lo: pageLo, hi: 1 }), [{ weight: { emphasis: 1, effort: 1 }, fields: { kind: 'page' } }]);
  adopt(root, both({ lo: 0, hi: pageLo }), withEnd(END_SHARE.root, themes.map(themeChild)));
  return root;
}

export const root = build();
export const page = root.children.find((node): node is PageNode => node.kind === 'page')!;

/** The root, then every theme and project, in reading order. */
export const places: readonly Place[] = [root, ...root.children.flatMap(theme =>
  theme.kind === 'theme' ? [theme, ...theme.children.filter(child => child.kind === 'project')] : []
)];

export function isPlace(node: Node): node is Place {
  return node.kind === 'root' || node.kind === 'theme' || node.kind === 'project';
}

/** The slice where a message stopping at `place` ends. */
export function endOf(place: Place): EndNode {
  return place.children.at(-1) as EndNode;
}

/** Nodes from the root down to `node`, inclusive. */
export function lineage(node: Node): Node[] {
  const nodes: Node[] = [];
  for (let n: Node | null = node; n; n = n.parent) nodes.unshift(n);
  return nodes;
}

export function name(node: Node): string {
  switch (node.kind) {
    case 'root': return 'khoda81';
    case 'theme': return node.theme.name;
    case 'project': return node.project.name;
    case 'link': return `${node.link.label} ↗`;
    case 'end': return `∎ ${name(node.parent!)}`;
    case 'page': return 'this page';
  }
}

function slugOf(place: Place): string {
  return place.kind === 'root' ? '' : place.kind === 'theme' ? place.theme.slug : place.project.slug;
}

export function find(slug: string): Place | undefined {
  return places.find(place => place.kind !== 'root' && slugOf(place) === slug);
}

/** The span between the two measures: t = 0 is emphasis, t = 1 is effort. */
export function spanAt(node: Node, t: number): Span {
  const { emphasis: a, effort: b } = node.spans;
  return { lo: a.lo + (b.lo - a.lo) * t, hi: a.hi + (b.hi - a.hi) * t };
}

/** Bits of entropy in the choice among a node's children. */
export function entropy(node: Node, t: number): number {
  const { lo, hi } = spanAt(node, t);
  return node.children.reduce((sum, child) => {
    const s = spanAt(child, t);
    const p = (s.hi - s.lo) / (hi - lo);
    return sum - p * Math.log2(p);
  }, 0);
}

/** The shortest bit string whose dyadic interval [0.b, 0.b + 2^−|b|) lies inside `span`. */
export function codeword({ lo, hi }: Span): string {
  for (let bits = 0; bits <= 52; bits += 1) {
    const unit = 2 ** -bits;
    const index = Math.ceil(lo / unit);
    if ((index + 1) * unit <= hi) return bits === 0 ? '' : index.toString(2).padStart(bits, '0');
  }
  throw new RangeError(`no codeword of at most 52 bits fits in [${lo}, ${hi})`);
}

/** Codewords name places by the emphasis measure, so links don't change when the view does. */
export function encode({ place, level }: Focus): string {
  return PAGE_CODE.repeat(level) + codeword(endOf(place).spans.emphasis);
}

/**
 * The place a bit string leads to: each PAGE_CODE prefix enters the page once
 * more, then bits are read until they no longer fit inside a single child. A
 * prefix of a codeword therefore decodes to an ancestor of its place.
 */
export function decode(bits: string): Focus | undefined {
  if (!/^[01]*$/.test(bits)) return undefined;
  let level = 0;
  while (bits.startsWith(PAGE_CODE)) {
    bits = bits.slice(PAGE_BITS);
    level += 1;
  }
  const read = bits.slice(0, 52);
  const lo = read === '' ? 0 : parseInt(read, 2) * 2 ** -read.length;
  const hi = lo + 2 ** -read.length;
  let place: Place = root;
  for (;;) {
    const child: Node | undefined = place.children.find(c => c.spans.emphasis.lo <= lo && hi <= c.spans.emphasis.hi);
    if (!child || !isPlace(child)) return { place, level };
    place = child;
  }
}
