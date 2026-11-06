import { PAGE_BITS, root, spanAt, type Node } from '../code.ts';
import { raise, toScreen, type Camera, type Viewport } from './view.ts';

/** A node as drawn this frame. Boxes tile the plane: siblings split the height, children sit to the right. */
export type Box = {
  readonly node: Node;
  /** The recursion level the node is at. */
  readonly level: number;
  /** Unique among this frame's boxes, and stable across frames. */
  readonly key: string;
  /** Screen rectangle in CSS px. */
  readonly x0: number;
  readonly x1: number;
  readonly y0: number;
  readonly y1: number;
  /** Probability given its parent. */
  readonly p: number;
  /** Probability within its recursion level. */
  readonly P: number;
  /** Bits from the top of the outermost page: −log₂ P plus PAGE_BITS per level. */
  readonly bits: number;
};

/** The root is drawn as a one-bit column left of the origin, as the place everything starts from. */
const ROOT_BITS = 1;
/** Below this height a box and everything inside it is too thin to see. */
const MIN_HEIGHT = .6;

/**
 * Every box visible from `cam`, parents before children. Traversal starts one
 * recursion level above the camera, so the page that contains its level stays
 * visible to the left, and descends into the page until boxes are sub-pixel.
 */
export function layout(cam: Camera, vp: Viewport, t: number, limit: number): Box[] {
  const base = 0 < cam.level ? raise(cam) : cam;
  const boxes: Box[] = [];

  /** `depth` counts recursion levels below the base; `parentP` is the parent's probability in base coordinates. */
  const visit = (node: Node, depth: number, parentP: number) => {
    if (limit <= boxes.length) return;
    const s = spanAt(node, t), scale = 2 ** (-PAGE_BITS * depth);
    const lo = depth === 0 ? s.lo : 1 - (1 - s.lo) * scale;
    const P = (s.hi - s.lo) * scale;
    const xRight = -Math.log2(P);
    const topLeft = toScreen(base, vp, node.kind === 'root' ? -ROOT_BITS : -Math.log2(parentP), lo + P);
    const bottomRight = toScreen(base, vp, xRight, lo);
    const x0 = topLeft.x, y0 = topLeft.y, x1 = bottomRight.x, y1 = bottomRight.y;
    // Children lie inside this box's height and to its right, so they are culled with it.
    if (y1 < 0 || vp.height < y0 || vp.width < x0 || y1 - y0 < MIN_HEIGHT) return;

    const level = base.level + depth;
    // A copy of the root is the page box that holds it, so only the outermost root gets a column.
    if (node.kind !== 'root' || depth === 0) {
      boxes.push({ node, level, key: `${level}:${node.id}`, x0, x1, y0, y1, p: P / parentP, P: P / scale, bits: xRight + PAGE_BITS * base.level });
    }
    const children = node.kind === 'page' ? root.children : node.children;
    const childDepth = node.kind === 'page' ? depth + 1 : depth;
    for (const child of children) visit(child, childDepth, P);
  };

  visit(root, 0, 1);
  return boxes;
}

/** The box under a screen point. Boxes don't overlap, so there is at most one. */
export function boxAt(boxes: readonly Box[], x: number, y: number): Box | undefined {
  return boxes.find(box => box.x0 <= x && x < box.x1 && box.y0 <= y && y < box.y1);
}
