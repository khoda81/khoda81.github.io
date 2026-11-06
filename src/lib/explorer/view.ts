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

/**
 * Keeps the camera in the level it is looking at, so coordinates never shrink
 * below float precision however long you zoom: it goes a level down once its
 * left edge passes the page's right edge inside the page, and back up once it
 * leaves the level's root. The half-bit gap stops it flapping at the boundary.
 */
export function renormalize(cam: Camera): Camera {
  for (;;) {
    if (PAGE_BITS + .5 <= cam.x && PAGE_LO <= cam.y && cam.y < 1) {
      cam = { level: cam.level + 1, x: cam.x - PAGE_BITS, y: (cam.y - PAGE_LO) * 2 ** PAGE_BITS };
    } else if (0 < cam.level && (cam.x < 0 || cam.y < 0 || 1 <= cam.y)) {
      cam = raise(cam);
    } else {
      return cam;
    }
  }
}

export type Flight = { readonly duration: number; at(t: number): Camera };

/**
 * The smooth zoom-and-pan path of van Wijk and Nuij (2003): it zooms out just
 * far enough to keep both ends in context, then in. `duration` is in ms.
 */
export function flight(from: Camera, to: Camera): Flight {
  const level = Math.min(from.level, to.level);
  const a = raise(from, from.level - level), b = raise(to, to.level - level);
  const w0 = viewSpan(a.x), w1 = viewSpan(b.x), d = Math.abs(b.y - a.y), sign = Math.sign(b.y - a.y);
  const rho = Math.SQRT2, rho2 = 2, rho4 = 4;
  const camera = (y: number, w: number) => renormalize({ level, x: -Math.log2(w) - CONTEXT_BITS, y });

  if (d < 1e-12 * w0) {
    const S = Math.log(w1 / w0) / rho;
    return { duration: span(S), at: t => camera(a.y, w0 * Math.exp(rho * t * S)) };
  }
  const b0 = (w1 * w1 - w0 * w0 + rho4 * d * d) / (2 * w0 * rho2 * d);
  const b1 = (w1 * w1 - w0 * w0 - rho4 * d * d) / (2 * w1 * rho2 * d);
  const r0 = Math.log(Math.sqrt(b0 * b0 + 1) - b0), r1 = Math.log(Math.sqrt(b1 * b1 + 1) - b1);
  const S = (r1 - r0) / rho;
  return {
    duration: span(S),
    at: t => {
      const s = t * S;
      const u = w0 / (rho2 * d) * (Math.cosh(r0) * Math.tanh(rho * s + r0) - Math.sinh(r0));
      return camera(a.y + sign * u * d, w0 * Math.cosh(r0) / Math.cosh(rho * s + r0));
    }
  };
}

/** Milliseconds for a path of length `S`: longer journeys take longer, within reason. */
function span(S: number): number {
  return Math.min(1700, Math.max(420, Math.abs(S) * 520));
}
