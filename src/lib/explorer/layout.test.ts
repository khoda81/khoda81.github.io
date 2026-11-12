/// <reference types="bun" />
import { expect, test } from 'bun:test';
import { placeAt, root } from '../code.ts';
import { boxAt, layout } from './layout.ts';
import { frame } from './view.ts';

const vp = { width: 1440, height: 900 };

test('the root view shows the themes and, inside the page, the root again', () => {
  const boxes = layout(frame(root.spans.emphasis, 0), vp, 0, 4000);
  expect(boxes[0]!.node).toBe(root);
  expect(boxes.filter(b => b.node.kind === 'theme' && b.level === 0)).toHaveLength(6);
  expect(boxes.some(b => b.node.kind === 'theme' && b.level === 1)).toBe(true);
});

test('boxes never overlap, so a point picks at most one', () => {
  const natlas = placeAt('/interfaces/natlas/')!;
  const boxes = layout(frame(natlas.spans.emphasis, 0), vp, .5, 4000);
  for (const [i, a] of boxes.entries()) {
    for (const b of boxes.slice(i + 1)) {
      const overlap = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > 1e-6 && Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) > 1e-6;
      expect(overlap).toBe(false);
    }
  }
  const natlasBox = boxes.find(b => b.node === natlas && b.level === 0)!;
  expect(boxAt(boxes, (natlasBox.x0 + natlasBox.x1) / 2, (natlasBox.y0 + natlasBox.y1) / 2)).toBe(natlasBox);
});

test('from inside the page, the outer level stays visible on the left', () => {
  const boxes = layout(frame(root.spans.emphasis, 1), vp, 0, 4000);
  expect(boxes.some(b => b.node.kind === 'page' && b.level === 0)).toBe(true);
  const theme = boxes.find(b => b.node.kind === 'theme' && b.level === 1)!;
  expect(theme.bits).toBeCloseTo(-Math.log2(theme.P) + 4, 9);
});
