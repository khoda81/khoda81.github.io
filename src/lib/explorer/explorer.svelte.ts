import { decode, encode, find, isPlace, root, type Focus, type Measure, type Place } from '../code.ts';
import type { Box } from './layout.ts';
import { CONTEXT_BITS, type Camera } from './view.ts';

/** Where the pointer is in information space. */
export type Reading = { readonly bits: number; readonly p: number };

class Explorer {
  /** The place being read; the scene flies to it whenever it is replaced. */
  focus = $state.raw<Focus>({ place: root, level: 0 });
  measure = $state<Measure>('emphasis');
  /** Published by the scene every frame. */
  camera = $state.raw<Camera>({ level: 0, x: -CONTEXT_BITS, y: .5 });
  hover = $state.raw<Box | null>(null);
  reading = $state.raw<Reading | null>(null);

  /** Reads `focus`, and makes the URL its codeword so it can be shared and so Back goes back. */
  go(focus: Focus): void {
    this.focus = focus;
    const bits = encode(focus);
    if (location.hash.slice(1) !== bits) location.hash = bits;
  }

  /** Moves through the tree of places: out to the parent, in to the first child, or across to a sibling. */
  step(direction: 'out' | 'in' | 'previous' | 'next'): void {
    const { place, level } = this.focus;
    if (direction === 'out') {
      if (place.parent) this.go({ place: place.parent as Place, level });
      else if (0 < level) this.go({ place: root, level: level - 1 });
      return;
    }
    if (direction === 'in') {
      const first = place.children.find(isPlace);
      if (first) this.go({ place: first, level });
      return;
    }
    if (!place.parent) return;
    const siblings = place.parent.children.filter(isPlace);
    const next = siblings[siblings.indexOf(place) + (direction === 'next' ? 1 : -1)];
    if (next) this.go({ place: next, level });
  }
}

export const explorer = new Explorer();

/** The place a URL hash names: a codeword, or a slug for links meant to outlive a change of weights. */
export function fromHash(hash: string): Focus | undefined {
  const name = decodeURIComponent(hash.replace(/^#/, ''));
  const place = find(name);
  return place ? { place, level: 0 } : decode(name);
}

export function same(a: Focus, b: Focus): boolean {
  return a.place === b.place && a.level === b.level;
}
