/// <reference types="bun" />
import { expect, test } from 'bun:test';
import { placeAt, root } from '../code.ts';
import { boxAt, layout } from './layout.ts';
import { frame, renormalize } from './view.ts';

const vp = { width: 1440, height: 900 };

test('the root view shows the themes, the page around them on the left, and inside the page the root again', () => {
  const boxes = layout(frame(root.spans.emphasis, 0), vp, 0, 4000);
  expect(boxes.some(b => b.node === root)).toBe(false);
  expect(boxes[0]!.node.kind).toBe('page');
  expect(boxes[0]!.level).toBe(-1);
  expect(boxes[0]!.x0 <= 0).toBe(true);
  expect(boxes.filter(b => b.node.kind === 'theme' && b.level === 0)).toHaveLength(6);
  expect(boxes.some(b => b.node.kind === 'theme' && b.level === 1)).toBe(true);
});

test('zoomed far out, pages around pages still cover the whole screen', () => {
  const boxes = layout(renormalize(frame(root.spans.emphasis, 0, 9)), vp, 0, 4000);
  const covered = (x: number, y: number) => boxes.some(b => b.x0 <= x && x < b.x1 && b.y0 <= y && y < b.y1);
  for (const [x, y] of [[0, vp.height - 1], [vp.width - 1, vp.height - 1], [1, 1], [vp.width / 2, vp.height / 2]]) expect(covered(x!, y!)).toBe(true);
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
  // A project is a leaf and runs on to the right, so probe just inside its left edge.
  expect(natlasBox.x1).toBe(Infinity);
  expect(boxAt(boxes, natlasBox.x0 + 10, (natlasBox.y0 + natlasBox.y1) / 2)).toBe(natlasBox);
});

test('from inside the page, the outer level stays visible on the left', () => {
  const boxes = layout(frame(root.spans.emphasis, 1), vp, 0, 4000);
  expect(boxes.some(b => b.node.kind === 'page' && b.level === 0)).toBe(true);
  const theme = boxes.find(b => b.node.kind === 'theme' && b.level === 1)!;
  expect(theme.bits).toBeCloseTo(-Math.log2(theme.P) + 4, 9);
});
