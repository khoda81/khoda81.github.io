/// <reference types="bun" />
import { describe, expect, test } from 'bun:test';
import { codeword, decode, encode, endOf, find, page, PAGE_CODE, places, root, type Measure, type Node, type Span } from './code.ts';

const all: Node[] = [];
(function walk(node: Node) {
  all.push(node);
  node.children.forEach(walk);
})(root);

const dyadic = (bits: string): Span => {
  const lo = bits === '' ? 0 : parseInt(bits, 2) / 2 ** bits.length;
  return { lo, hi: lo + 2 ** -bits.length };
};

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

  test('each place’s codeword lands in its end slice and decodes back to it, at any depth', () => {
    for (const place of places) {
      const bits = encode({ place, level: 0 });
      const span = dyadic(bits), end = endOf(place).spans.emphasis;
      expect(end.lo <= span.lo && span.hi <= end.hi).toBe(true);
      for (const level of [0, 1, 3]) expect(decode(encode({ place, level }))).toEqual({ place, level });
    }
  });

  test('a prefix of a codeword decodes to an ancestor', () => {
    for (const place of places) {
      const bits = encode({ place, level: 0 });
      for (let n = 0; n <= bits.length; n += 1) {
        let ancestor: Node | null = place;
        const decoded = decode(bits.slice(0, n))!.place;
        while (ancestor && ancestor !== decoded) ancestor = ancestor.parent;
        expect(ancestor).toBe(decoded);
      }
    }
  });

  test('anything that is not bits is not a codeword', () => {
    expect(decode('natlas')).toBeUndefined();
    expect(decode('')).toEqual({ place: root, level: 0 });
    expect(find('natlas')?.kind).toBe('project');
  });
});
