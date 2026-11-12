import { PAGE_BITS, type Span } from '../code.ts';

/**
 * Where the camera looks, in the coordinates of recursion `level`: the view's
 * left edge is `x` bits deep and its centre is at probability `y`. Probability
 * rises upward, like a number line.
 *
 * As in natlas, depth and magnification are one coordinate: the view spans
 * 2^−(x + CONTEXT_BITS) of probability, so one bit deeper doubles the zoom and
 * a box's height on screen is its probability relative to where you stand.
 */
export type Camera = { readonly level: number; readonly x: number; readonly y: number };
export type Viewport = { readonly width: number; readonly height: number };

/** How many bits of the focused place stay visible at the left edge. */
export const CONTEXT_BITS = 1.25;

const PAGE_LO = 1 - 2 ** -PAGE_BITS;

export function pxPerBit({ width }: Viewport): number {
  return Math.min(190, Math.max(84, width / 7.5));
}

/** The probability the view's height covers at depth `x`. */
export function viewSpan(x: number): number {
  return 2 ** (-x - CONTEXT_BITS);
}

export function toScreen(cam: Camera, vp: Viewport, bits: number, p: number): { x: number; y: number } {
  return { x: (bits - cam.x) * pxPerBit(vp), y: vp.height / 2 - (p - cam.y) / viewSpan(cam.x) * vp.height };
}

export function fromScreen(cam: Camera, vp: Viewport, x: number, y: number): { bits: number; p: number } {
  return { bits: cam.x + x / pxPerBit(vp), p: cam.y - (y - vp.height / 2) / vp.height * viewSpan(cam.x) };
}

/** A point in information space, in the coordinates of recursion `level`. */
export type Grab = { readonly level: number; readonly bits: number; readonly p: number };

/**
 * The camera that shows `grab` at screen point `at`, `zoom` bits deeper.
 * Depth is also the horizontal axis, so zooming slides the point sideways.
 */
export function hold(grab: Grab, vp: Viewport, at: { x: number; y: number }, zoom = 0): Camera {
  const x = grab.bits - at.x / pxPerBit(vp) + zoom;
  return renormalize({ level: grab.level, x, y: grab.p + (at.y - vp.height / 2) / vp.height * viewSpan(x) });
}

/**
 * The camera that shows a place's children filling the height, with the place
 * itself as context on the left; each bit of `margin` halves how much of the
 * height they take, showing more of the place's surroundings.
 */
export function frame(span: Span, level: number, margin = 0): Camera {
  return { level, x: -Math.log2(span.hi - span.lo) - CONTEXT_BITS - margin, y: (span.lo + span.hi) / 2 };
}

/** The same view in the coordinates of `levels` recursion levels up, where this level is the page's slice. */
export function raise(cam: Camera, levels = 1): Camera {
  return { level: cam.level - levels, x: cam.x + PAGE_BITS * levels, y: 1 - (1 - cam.y) * 2 ** (-PAGE_BITS * levels) };
}

/** How deep into one level the camera may go: its view is then still many doubles tall, and its codeword fits in one. */
const MAX_DEPTH = 40;

/**
 * Keeps the camera in the level it is looking at, so coordinates never shrink
 * below float precision however long you zoom: it goes a level down once its
 * left edge passes the page's right edge inside the page, and back up once it
 * leaves the level's root. The half-bit gap stops it flapping at the boundary.
 * Outside the page there is no deeper level, so zoom stops at MAX_DEPTH.
 */
export function renormalize(cam: Camera): Camera {
  for (;;) {
    if (PAGE_BITS + .5 <= cam.x && PAGE_LO <= cam.y && cam.y < 1) {
      cam = { level: cam.level + 1, x: cam.x - PAGE_BITS, y: (cam.y - PAGE_LO) * 2 ** PAGE_BITS };
    } else if (0 < cam.level && (cam.x < 0 || cam.y < 0 || 1 <= cam.y)) {
      cam = raise(cam);
    } else {
      return cam.x <= MAX_DEPTH ? cam : { ...cam, x: MAX_DEPTH };
    }
  }
}

/** `at` takes the fraction of the way along, in [0, 1]. */
export type Flight = { readonly duration: number; at(t: number): Camera };

/** A view's vertical extent in probability; its depth follows from `w`. */
type View = { readonly y: number; readonly w: number };

/**
 * The path between two cameras, as one straight motion when one view's centre
 * lies inside the other: the smaller view moves in a straight line on screen
 * while it grows to fill it, or shrinks away from filling it. Depth and zoom
 * are one coordinate, so both screen axes move at constant speed and nothing
 * pans first and zooms after. Views too far apart for that zoom out to the
 * smallest view holding both, then in. `duration` is in ms.
 */
export function flight(from: Camera, to: Camera): Flight {
  const level = Math.min(from.level, to.level);
  const a = view(raise(from, from.level - level)), b = view(raise(to, to.level - level));
  const [small, large] = a.w < b.w ? [a, b] : [b, a];
  const lo = Math.min(a.y - a.w / 2, b.y - b.w / 2), hi = Math.max(a.y + a.w / 2, b.y + b.w / 2);
  const middle = Math.abs(small.y - large.y) <= large.w / 2 ? large : { y: (lo + hi) / 2, w: hi - lo };
  // Each leg is as long as the bits it zooms plus the view heights it pans.
  const length = (inner: View) => Math.log2(middle.w / inner.w) + Math.abs(inner.y - middle.y) / middle.w;
  const out = length(a), into = length(b), total = out + into;
  const camera = ({ y, w }: View) => renormalize({ level, x: -Math.log2(w) - CONTEXT_BITS, y });

  return {
    duration: Math.min(1700, Math.max(420, total * 260)),
    at: t => {
      const d = t * total;
      return camera(d < out ? leg(a, middle, d / out) : leg(b, middle, into === 0 ? 0 : 1 - (d - out) / into));
    }
  };
}

/**
 * The view `u` of the way from `inner` (0) out to `outer` (1): zoom is
 * geometric in `u`, and `inner`'s centre moves linearly on screen from the
 * middle to where `outer` shows it.
 */
function leg(inner: View, outer: View, u: number): View {
  const w = inner.w * (outer.w / inner.w) ** u;
  return { y: inner.y - u * (inner.y - outer.y) / outer.w * w, w };
}

const view = (cam: Camera): View => ({ y: cam.y, w: viewSpan(cam.x) });
