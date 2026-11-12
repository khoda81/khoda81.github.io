/// <reference types="bun" />
import { describe, expect, test } from 'bun:test';
import { PAGE_CODE, placeAt, places, root, spanAt, type Place } from '../code.ts';
import { addressOf, cameraFor, href, parse, renumber, settle, type Address } from './address.ts';
import { frame, renormalize, type Camera } from './view.ts';

const at = (place: Place, bits = '', level = 0): Address => ({ focus: { place, level }, bits });
const markets = placeAt('/markets/')!, natlas = placeAt('/interfaces/natlas/')!;

describe('addresses', () => {
  test('a place shown whole needs no bits, at any depth and under either measure', () => {
    for (const place of places) {
      for (const level of [0, 2]) {
        for (const t of [0, 1]) expect(addressOf(at(place, '', level).focus, cameraFor(at(place, '', level), t), t)).toEqual(at(place, '', level));
      }
    }
  });

  test('bits inside a place come back as typed', () => {
    for (const address of [at(markets, '1010'), at(root, '0110'), at(root, PAGE_CODE.repeat(3) + '0101'), at(markets, '1', 1)]) {
      expect(addressOf(address.focus, cameraFor(address, 0), 0)).toEqual(address);
    }
  });

  test('bits are read inside the place, as if it were all of [0, 1)', () => {
    const cam = cameraFor(at(markets, '1'), 0), s = spanAt(markets, 0);
    expect<Camera>(cam).toEqual(frame({ lo: (s.lo + s.hi) / 2, hi: s.hi }, 0));
  });

  test('a view that leaves its place is addressed from the nearest place still holding it', () => {
    const address = addressOf({ place: natlas, level: 0 }, cameraFor(at(markets), 0), 0);
    expect(address.focus.place).toBe(root);
    expect(cameraFor(address, 0).y).toBeCloseTo((spanAt(markets, 0).lo + spanAt(markets, 0).hi) / 2, 1);
  });

  test('a view inside a single project shows the project whole, and a project URL names nothing inside it', () => {
    const lobservatory = placeAt('/markets/lobservatory/')!;
    expect<Camera>(cameraFor(at(markets, '1011'), 0)).toEqual(renormalize(frame(spanAt(lobservatory, 0), 0)));
    const straddling = cameraFor(at(markets, '1010'), 0);
    expect(settle(straddling, 0)).toEqual(straddling);
    expect(parse('/markets/lobservatory/', '#01')).toEqual(at(lobservatory));
  });

  test('no camera settles inside a project, however it got there', () => {
    const qbar = spanAt(placeAt('/interfaces/qbar/')!, 0), whole = renormalize(frame(qbar, 0));
    // Thrown deep into it, past the half-way mark of its height.
    const deep = { level: 0, x: 31, y: qbar.lo + (qbar.hi - qbar.lo) * .3 };
    expect<Camera>(settle(deep, 0)).toEqual(whole);
    expect<Camera>(settle(whole, 0)).toEqual(whole);
  });

  test('zooming out of a place leaves it for the place around it', () => {
    const view = frame(spanAt(markets, 0), 0, 1.5);
    expect(addressOf({ place: markets, level: 0 }, view, 0).focus.place).toBe(root);
    expect(addressOf({ place: markets, level: 0 }, frame(spanAt(markets, 0), 0, .5), 0)).toEqual(at(markets));
  });

  test('URLs are the path, then the bits; inside the page, bits from the root', () => {
    expect(href(at(root))).toBe('/');
    expect(href(at(markets, '1011'))).toBe('/markets/#1011');
    // Every level looks alike, and the scene renumbers the reader's to 0.
    expect(href(at(markets, '1011', 1))).toBe('/markets/#1011');
    expect(parse('/markets', '#1011')).toEqual(at(markets, '1011'));
    expect(parse('/markets/', '#lobservatory')).toEqual(at(markets));
    expect(parse('/nowhere/', '')).toBeUndefined();
    for (const address of [at(markets, '1011'), at(root, PAGE_CODE + '01')]) {
      const [path, bits = ''] = href(address).split('#');
      expect(parse(path!, bits)).toEqual(address);
    }
  });
});

describe('the recursion', () => {
  test('renumbering levels changes nothing on screen', () => {
    expect(renumber(at(root, PAGE_CODE + '01'), -1)).toEqual(at(root, '01'));
    expect(renumber(at(markets, '1', 2), -1)).toEqual(at(markets, '1', 1));
    expect(renumber(at(markets, '1'), 1)).toEqual(at(markets, '1', 1));
    const cam = cameraFor(at(markets, '1', 2), 0), renumbered = cameraFor(at(markets, '1', 1), 0);
    expect({ ...cam, level: cam.level - 1 }).toEqual(renumbered);
    expect(() => renumber(at(markets), -1)).toThrow();
  });

  test('zooming out of the root leads into the root around it', () => {
    const out = cameraFor(at(root, '', -1), 0);
    expect(addressOf({ place: root, level: 0 }, out, 0)).toEqual(at(root, '', -1));
  });
});
