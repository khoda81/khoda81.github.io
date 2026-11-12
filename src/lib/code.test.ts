/// <reference types="bun" />
import { describe, expect, test } from 'bun:test';
import { codeword, interval, page, PAGE_CODE, pathOf, placeAt, places, root, type Measure, type Node } from './code.ts';

const all: Node[] = [];
(function walk(node: Node) {
  all.push(node);
  node.children.forEach(walk);
})(root);

describe('the interval tree', () => {
  for (const measure of ['emphasis', 'effort'] as Measure[]) {
    test(`children tile their parent exactly under ${measure}`, () => {
      for (const node of all.filter(n => 0 < n.children.length)) {
        const spans = node.children.map(child => child.spans[measure]);
        expect(spans[0]!.hi).toBe(node.spans[measure].hi);
        expect(spans.at(-1)!.lo).toBe(node.spans[measure].lo);
        spans.forEach((span, i) => {
          expect(span.lo < span.hi).toBe(true);
          if (0 < i) expect(span.hi).toBe(spans[i - 1]!.lo);
        });
      }
    });
  }

  test('the page is the dyadic top sixteenth under both measures', () => {
    expect(root.children[0]).toBe(page);
    for (const span of [page.spans.emphasis, page.spans.effort]) expect(span).toEqual({ lo: 15 / 16, hi: 1 });
    expect(codeword(page.spans.emphasis)).toBe(PAGE_CODE);
  });
});

describe('codewords', () => {
  test('are the shortest dyadic interval inside the span', () => {
    expect(codeword({ lo: 0, hi: 1 })).toBe('');
    expect(codeword({ lo: .25, hi: .8 })).toBe('01');
    expect(codeword({ lo: .3, hi: .45 })).toBe('0101');
    expect(codeword({ lo: .5, hi: .5000001 })).toBe('1' + '0'.repeat(23));
  });

  test('name the interval they were read from', () => {
    for (const bits of ['', '0', '1', '1011', '0000000001', '1'.repeat(40)]) expect(codeword(interval(bits))).toBe(bits);
  });
});

describe('paths', () => {
  test('name every place, and only places', () => {
    for (const place of places) expect(placeAt(pathOf(place))).toBe(place);
    expect(pathOf(placeAt('/markets/lobservatory')!)).toBe('/markets/lobservatory/');
    expect(placeAt('/lobservatory/')).toBeUndefined();
    expect(placeAt('/markets/natlas/')).toBeUndefined();
  });
});
