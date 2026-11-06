import { fractionalAge } from './age.ts';

/** The page's clocks, sampled once per frame. */
export type Snapshot = {
  /** Seconds since the page started. */
  uptime: number;
  frame: number;
  /** Smoothed frames per second. */
  fps: number;
  /** Years; see fractionalAge. */
  age: number;
};

class Live {
  snapshot = $state.raw<Snapshot>({ uptime: 0, frame: 0, fps: 60, age: fractionalAge(Date.now()) });
}

export const live = new Live();

/** Starts updating `live` every frame and returns a function that stops it. */
export function startLive(): () => void {
  const startedAt = performance.now();
  let frame = 0, lastFrameAt = startedAt, fps = 60, request = 0;
  const tick = (now: number) => {
    frame += 1;
    fps = fps * .92 + 1000 / Math.max(.1, now - lastFrameAt) * .08;
    lastFrameAt = now;
    live.snapshot = { uptime: (now - startedAt) / 1000, frame, fps, age: fractionalAge(Date.now()) };
    request = requestAnimationFrame(tick);
  };
  request = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(request);
}
