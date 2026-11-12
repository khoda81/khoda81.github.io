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

/**
 * The path between two cameras, as a transition of the interval on screen:
 * both of its edges move from where they start to where they end by the same
 * fraction at every moment, so an edge the two views share never moves, and
 * no edge ever doubles back. The fraction grows geometrically, so the zoom
 * runs at a constant rate in bits, and with it the depth, which is the zoom.
 * It is a scaling about the one point both views show at the same place.
 *
 * Between views far apart that would pan across many screens, so instead the
 * flight widens to the smallest interval holding both, then narrows to the
 * destination. `duration` is in ms.
 */
export function flight(from: Camera, to: Camera): Flight {
  const level = Math.min(from.level, to.level);
  const a = viewOf(raise(from, from.level - level)), b = viewOf(raise(to, to.level - level));
  const both = { lo: Math.min(a.lo, b.lo), hi: Math.max(a.hi, b.hi) };
  const legs: [Span, Span][] = width(both) <= 2 * Math.max(width(a), width(b)) ? [[a, b]] : [[a, both], [both, b]];
  const lengths = legs.map(([p, q]) => length(p, q));
  const total = lengths.reduce((sum, l) => sum + l, 0);

  return {
    duration: Math.min(1700, Math.max(420, total * 260)),
    at: t => {
      let d = t * total;
      for (const [i, [p, q]] of legs.entries()) {
        const l = lengths[i]!;
        if (d <= l || i === legs.length - 1) return cameraOn(level, between(p, q, l === 0 ? 1 : Math.min(1, d / l)));
        d -= l;
      }
      throw new Error('a flight has at least one leg');
    }
  };
}

/** The interval `u` of the way from `p` to `q`: both edges move by the fraction of the width's geometric progress. */
function between(p: Span, q: Span, u: number): Span {
  const r = width(q) / width(p);
  const s = Math.abs(r - 1) < 1e-9 ? u : (r ** u - 1) / (r - 1);
  return { lo: p.lo + (q.lo - p.lo) * s, hi: p.hi + (q.hi - p.hi) * s };
}

/** How long a leg is: the bits it zooms, plus the view heights it pans. */
function length(p: Span, q: Span): number {
  return Math.abs(Math.log2(width(q) / width(p))) + Math.abs(p.lo + p.hi - q.lo - q.hi) / 2 / Math.max(width(p), width(q));
}

const width = ({ lo, hi }: Span) => hi - lo;

const viewOf = (cam: Camera): Span => {
  const w = viewSpan(cam.x);
  return { lo: cam.y - w / 2, hi: cam.y + w / 2 };
};

/** The camera whose view is exactly `span`, at `level`. */
const cameraOn = (level: number, span: Span): Camera => renormalize({ level, x: -Math.log2(width(span)) - CONTEXT_BITS, y: (span.lo + span.hi) / 2 });
