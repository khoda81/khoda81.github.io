/// <reference types="bun" />
import { describe, expect, test } from 'bun:test';
import { flight, frame, fromScreen, hold, raise, renormalize, toScreen, type Camera } from './view.ts';

const vp = { width: 1200, height: 800 };

/** A camera's position in level-0 coordinates, to compare cameras across levels. */
const absolute = (cam: Camera) => raise(cam, cam.level);

describe('the view', () => {
  test('screen and information coordinates invert each other', () => {
    const cam = { level: 0, x: 2.3, y: .41 };
    const { x, y } = toScreen(cam, vp, 3.1, .4);
    const back = fromScreen(cam, vp, x, y);
    expect(back.bits).toBeCloseTo(3.1, 12);
    expect(back.p).toBeCloseTo(.4, 12);
  });

  test('framing a place fills the height with it, probability rising upward', () => {
    const cam = frame({ lo: .25, hi: .375 }, 0);
    expect(toScreen(cam, vp, 0, .375).y).toBeCloseTo(0, 9);
    expect(toScreen(cam, vp, 0, .25).y).toBeCloseTo(vp.height, 9);
  });

  test('holding a point keeps it under the pointer', () => {
    const cam = { level: 0, x: 1.5, y: .3 };
    const grab = { level: 0, ...fromScreen(cam, vp, 300, 200) };
    const moved = hold(grab, vp, { x: 520, y: 610 });
    const back = toScreen(moved, vp, grab.bits, grab.p);
    expect(back.x).toBeCloseTo(520, 9);
    expect(back.y).toBeCloseTo(610, 9);
  });

  test('renormalizing moves between levels without moving the view', () => {
    for (const cam of [{ level: 0, x: 6, y: .97 }, { level: 2, x: -1, y: .5 }, { level: 1, x: 3, y: 1.2 }, { level: 0, x: 5, y: .3 }]) {
      const moved = renormalize(cam);
      expect(absolute(moved).x).toBeCloseTo(absolute(cam).x, 9);
      expect(absolute(moved).y).toBeCloseTo(absolute(cam).y, 12);
    }
    expect(renormalize({ level: 0, x: 6, y: .97 }).level).toBe(1);
    expect(renormalize({ level: 0, x: 6, y: .5 }).level).toBe(0);
  });

  test('a flight starts and ends at its endpoints, across levels', () => {
    const from = { level: 0, x: -1.25, y: .5 }, to = { level: 1, x: 2.4, y: .1 };
    const path = flight(from, to);
    for (const [t, cam] of [[0, from], [1, to]] as const) {
      expect(absolute(path.at(t)).x).toBeCloseTo(absolute(cam).x, 6);
      expect(absolute(path.at(t)).y).toBeCloseTo(absolute(cam).y, 9);
    }
    expect(0 < path.duration).toBe(true);
  });

  test('an edge both views share stays put, and the others never double back', () => {
    const from = frame({ lo: .25, hi: .75 }, 0), to = frame({ lo: .6, hi: .75 }, 0);
    const path = flight(from, to);
    let previous = toScreen(path.at(0), vp, 0, .25).y;
    for (let i = 1; i <= 50; i += 1) {
      const cam = absolute(path.at(i / 50));
      expect(toScreen(cam, vp, 0, .75).y).toBeCloseTo(0, 6);
      const bottom = toScreen(cam, vp, 0, .25).y;
      expect(previous <= bottom + 1e-9).toBe(true);
      previous = bottom;
    }
  });

  test('a flight between distant places zooms out only as far as shows both', () => {
    const from = frame({ lo: .1, hi: .12 }, 0), to = frame({ lo: .8, hi: .82 }, 0);
    const path = flight(from, to);
    const widest = Math.min(...Array.from({ length: 101 }, (_, i) => absolute(path.at(i / 100)).x));
    expect(widest).toBeCloseTo(frame({ lo: .1, hi: .82 }, 0).x, 6);
  });
});
