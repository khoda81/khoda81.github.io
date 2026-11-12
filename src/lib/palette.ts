import type { Node } from './code.ts';

export const BACKGROUND = '#080b10';

const themeColors: Record<string, string> = {
  interfaces: '#71ecc3',
  coding: '#76d7ff',
  markets: '#ffd36a',
  search: '#c9a7ff',
  systems: '#a3b8d0',
  play: '#ff9eb5'
};

/** A node's colour is its theme's; the root is neutral, and so is the page, which is the root one level in. */
export function colorOf(node: Node): string {
  for (let n: Node | null = node; n; n = n.parent) {
    if (n.kind === 'theme' || n.kind === 'project') return themeColors[n.theme.slug]!;
  }
  return '#d8e2f0';
}

/** Display-space RGB in [0, 1], as the scene's shader mixes colours the way CSS does. */
export function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
}
