import { codeword, interval, PAGE_CODE, pathOf, placeAt, places, root, spanAt, type Focus, type Place, type Span } from '../code.ts';
import { frame, raise, renormalize, viewSpan, type Camera } from './view.ts';

/**
 * Where the reader is: a place, and what is on screen as the codeword of an
 * interval of that place's slice, read as if the place were all of [0, 1).
 * The codeword is the biggest dyadic interval that fits on screen, and ''
 * shows the whole place.
 *
 * A URL is the place's path and the bits inside it, as /markets/#1011. The
 * levels of the page all look alike and the scene keeps the reader in level
 * 0, so the root of a URL is always the page the reader is in.
 */
export type Address = { readonly focus: Focus; readonly bits: string };

/** Projects are leaves, so they are framed with their neighbours and theme around them, a bit out. */
const PROJECT_MARGIN = 1;

/** A view's edges move by this share of its height before an interval stops fitting, so rounding never costs a bit. */
const SLACK = 1e-6;

declare const settled: unique symbol;

/**
 * A camera that shows something to read. A view inside a single project shows
 * nothing more than the project whole, only harder to leave, so no Settled
 * camera is one: `settle`, the only way to make one, shows the project whole.
 */
export type Settled = Camera & { readonly [settled]: true };

export function settle(cam: Camera, t: number): Settled {
  const normal = renormalize(cam), leaf = leafHolding(normal, t);
  return (leaf ? renormalize(frame(leaf, normal.level)) : normal) as Settled;
}

/** The camera that shows `address`. */
export function cameraFor(address: Address, t: number): Settled {
  return settle(aim(address, t), t);
}

function aim({ focus: { place, level }, bits }: Address, t: number): Camera {
  if (bits === '') return renormalize(frame(spanAt(place, t), level, place.kind === 'project' ? PROJECT_MARGIN : 0));
  if (place.kind !== 'root') return renormalize(frame(inside(spanAt(place, t), interval(bits)), level));
  // The page's bits are read as levels, so arbitrarily deep codewords keep their precision.
  let depth = level;
  while (bits.startsWith(PAGE_CODE)) {
    bits = bits.slice(PAGE_CODE.length);
    depth += 1;
  }
  return renormalize(frame(interval(bits), depth));
}

/** The slice of the project that holds all of `cam`'s view, if one does. */
function leafHolding(cam: Camera, t: number): Span | null {
  const view = viewOf(cam), slack = (view.hi - view.lo) * SLACK;
  for (const place of places) {
    if (place.kind !== 'project') continue;
    const slice = spanAt(place, t);
    if (slice.lo <= view.lo + slack && view.hi - slack <= slice.hi) return slice;
  }
  return null;
}

/**
 * The address of what `cam` shows, reading from `focus`. The reader has left
 * the focused place once the middle of the screen does, or once it is less of
 * the screen than a project framed on its own, so the address moves out to the
 * nearest place around it that the reader is still in.
 */
export function addressOf(focus: Focus, cam: Camera, t: number): Address {
  const { place, level } = focus;
  if (place.kind === 'root' && level < cam.level) {
    // The camera is inside the page: each level down is PAGE_CODE, exactly.
    return { focus, bits: PAGE_CODE.repeat(cam.level - level) + fit(viewOf(cam), root.spans.emphasis) };
  }
  const view = viewOf(raise(cam, cam.level - level));
  const slice = spanAt(place, t), middle = (view.lo + view.hi) / 2;
  const small = (slice.hi - slice.lo) * 2 ** PROJECT_MARGIN < (view.hi - view.lo) * (1 - SLACK);
  if (small || middle < slice.lo || slice.hi <= middle) {
    // The root is the page slice of a root one level out, so there is always a place around.
    return addressOf(place.parent ? { place: place.parent as Place, level } : { place: root, level: level - 1 }, cam, t);
  }
  return { focus, bits: fit(view, slice) };
}

/**
 * The same address with its levels numbered `by` deeper, as the scene does to
 * keep the camera in level 0. Every level looks exactly like the ones around
 * it, so renumbering changes nothing on screen: the reader can go in or out
 * forever, and wherever they are is the root.
 */
export function renumber({ focus: { place, level }, bits }: Address, by: 1 | -1): Address {
  if (by === 1 || 0 < level) return { focus: { place, level: level + by }, bits };
  // Numbered shallower, a root at level 0 or out says the same by entering its page one fewer time, which keeps it
  // in reach of a URL; only the root holds a view inside its page, so its bits begin by entering it.
  if (place.kind !== 'root' || !bits.startsWith(PAGE_CODE)) throw new Error(`${pathOf(place)}#${bits} is not inside the page`);
  return { focus: { place, level }, bits: bits.slice(PAGE_CODE.length) };
}

/** The URL of `address`, relative to the site; the scene renumbers any level to 0, where the same place has this URL. */
export function href({ focus, bits }: Address): string {
  return pathOf(focus.place) + (bits ? `#${bits}` : '');
}

/**
 * The address a URL names, or undefined for a path that names no place. A
 * hash that isn't bits names nothing more than the place, and neither does
 * any hash on a project, which has nothing inside.
 */
export function parse(pathname: string, hash: string): Address | undefined {
  const place = placeAt(pathname);
  if (!place) return undefined;
  const bits = hash.replace(/^#/, '');
  return { focus: { place, level: 0 }, bits: place.kind !== 'project' && /^[01]*$/.test(bits) ? bits : '' };
}

export function same(a: Address, b: Address): boolean {
  return a.bits === b.bits && a.focus.place === b.focus.place && a.focus.level === b.focus.level;
}

/** The span of probability a camera shows, in its level's coordinates. */
function viewOf(cam: Camera): Span {
  const w = viewSpan(cam.x);
  return { lo: cam.y - w / 2, hi: cam.y + w / 2 };
}

/** The part `part` names of `whole`, where `whole` is read as [0, 1). */
function inside(whole: Span, part: Span): Span {
  const width = whole.hi - whole.lo;
  return { lo: whole.lo + width * part.lo, hi: whole.lo + width * part.hi };
}

/** The codeword of the part of `view` inside `slice`, read relative to `slice`. */
function fit(view: Span, slice: Span): string {
  const width = slice.hi - slice.lo, slack = (view.hi - view.lo) * SLACK;
  const lo = Math.max(0, (view.lo - slack - slice.lo) / width), hi = Math.min(1, (view.hi + slack - slice.lo) / width);
  // Only the root, which nothing holds, can be off screen entirely; then the closest thing to show is all of it.
  return lo < hi ? codeword({ lo, hi }) : '';
}
