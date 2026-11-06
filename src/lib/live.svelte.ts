import { fractionalAge } from './age.ts';

export type Pointer = {
  /** Client coordinates in CSS px, within a viewport of width × height. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Smoothed, in px/s. */
  speed: number;
};

/** Everything on the page that changes over time, sampled once per frame by the top-level page. */
export type Snapshot = {
  /** Seconds since the page started. */
  uptime: number;
  frame: number;
  /** Smoothed frames per second. */
  fps: number;
  /** Years; see fractionalAge. */
  age: number;
  /** Null until the pointer first moves. */
  pointer: Pointer | null;
  scroll: { y: number; max: number; velocity: number };
};

class Live {
  snapshot = $state.raw<Snapshot>({
    uptime: 0,
    frame: 0,
    fps: 60,
    age: fractionalAge(Date.now()),
    pointer: null,
    scroll: { y: 0, max: 1, velocity: 0 }
  });
}

export const live = new Live();

declare global {
  interface Window {
    /** This page's live state, read by the mirror nested inside it. */
    portfolioLive?: Live;
  }
}

/** How many mirrors deep this document is; 0 for the page itself. Set from ?mirror=N in app.html. */
export function mirrorDepth(): number {
  return Number(document.documentElement.dataset.mirrorDepth ?? 0);
}

/**
 * Starts updating `live` every frame and returns a function that stops it.
 * The page samples itself; a mirror shows its parent's snapshot and follows its scroll.
 */
export function startLive(): () => void {
  window.portfolioLive = live;
  const source = mirrorDepth() === 0 ? undefined : parentLive();
  return source ? follow(source) : sample();
}

/** Undefined for a mirror URL opened on its own, or embedded by another site. */
function parentLive(): Live | undefined {
  try {
    return window.parent === window ? undefined : window.parent.portfolioLive;
  } catch {
    return undefined;
  }
}

function sample(): () => void {
  const startedAt = performance.now();
  let frame = 0, lastFrameAt = startedAt, fps = 60;
  let pointer: Pointer | null = null, lastPointerAt = startedAt;
  let lastScrollY = window.scrollY, scrollVelocity = 0, lastScrollAt = startedAt;

  const onPointerMove = (event: PointerEvent) => {
    const now = performance.now();
    const dt = Math.max(1, now - lastPointerAt);
    const instant = pointer ? Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) * 1000 / dt : 0;
    pointer = {
      x: event.clientX,
      y: event.clientY,
      width: innerWidth,
      height: innerHeight,
      speed: (pointer?.speed ?? 0) * .78 + instant * .22
    };
    lastPointerAt = now;
  };

  const onScroll = () => {
    const now = performance.now();
    const dt = Math.max(1, now - lastScrollAt);
    scrollVelocity = scrollVelocity * .72 + (window.scrollY - lastScrollY) * 1000 / dt * .28;
    lastScrollY = window.scrollY;
    lastScrollAt = now;
  };

  let request = 0;
  const tick = (now: number) => {
    frame += 1;
    fps = fps * .92 + 1000 / Math.max(.1, now - lastFrameAt) * .08;
    lastFrameAt = now;
    live.snapshot = {
      uptime: (now - startedAt) / 1000,
      frame,
      fps,
      age: fractionalAge(Date.now()),
      pointer,
      scroll: {
        y: window.scrollY,
        max: Math.max(1, document.documentElement.scrollHeight - innerHeight),
        velocity: scrollVelocity
      }
    };
    request = requestAnimationFrame(tick);
  };

  addEventListener('pointermove', onPointerMove, { passive: true });
  addEventListener('scroll', onScroll, { passive: true });
  request = requestAnimationFrame(tick);
  return () => {
    cancelAnimationFrame(request);
    removeEventListener('pointermove', onPointerMove);
    removeEventListener('scroll', onScroll);
  };
}

function follow(source: Live): () => void {
  let request = 0;
  // Animation frame callbacks run parent-first, so this reads the parent's current frame.
  const tick = () => {
    const snapshot = source.snapshot;
    live.snapshot = snapshot;
    const fraction = Math.min(1, Math.max(0, snapshot.scroll.y / snapshot.scroll.max));
    const target = fraction * Math.max(0, document.documentElement.scrollHeight - innerHeight);
    if (.75 < Math.abs(window.scrollY - target)) document.documentElement.scrollTop = target;
    request = requestAnimationFrame(tick);
  };
  request = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(request);
}
