import { goto } from '$app/navigation';
import { isPlace, root, type Focus, type Measure, type Place } from '../code.ts';
import { href, type Address } from './address.ts';
import type { Box } from './layout.ts';
import { CONTEXT_BITS, type Camera } from './view.ts';

/** Where the pointer is in information space. */
export type Reading = { readonly bits: number; readonly p: number };

/** How long a hand-moved view must rest before the URL is rewritten, as browsers throttle history updates. */
const SETTLE_MS = 400;

class Explorer {
  /**
   * Where the reader is, which the URL shows. Navigating replaces it and the
   * scene flies there; moving the camera by hand rewrites it to match.
   */
  here = $state.raw<Address>({ focus: { place: root, level: 0 }, bits: '' });
  measure = $state<Measure>('emphasis');
  /** Published by the scene every frame. */
  camera = $state.raw<Camera>({ level: 0, x: -CONTEXT_BITS, y: .5 });
  hover = $state.raw<Box | null>(null);
  reading = $state.raw<Reading | null>(null);
  #settling: ReturnType<typeof setTimeout> | undefined;

  get focus(): Focus {
    return this.here.focus;
  }

  /** The measure as the scene blends it once settled: 0 is emphasis, 1 is effort. */
  get t(): number {
    return this.measure === 'effort' ? 1 : 0;
  }

  get href(): string {
    return href(this.here);
  }

  /** Goes to `address`, as a new history entry unless `replace`, or unless it has the URL already there, as the root around the root does. */
  go(address: Address, replace = false): void {
    clearTimeout(this.#settling);
    this.here = address;
    void goto(this.href, { shallow: true, replace: replace || this.href === location.pathname + location.hash });
  }

  /** Takes on the address of a view the reader moved to, without flying; the URL follows once the view rests. */
  follow(address: Address): void {
    this.here = address;
    clearTimeout(this.#settling);
    this.#settling = setTimeout(() => void goto(this.href, { shallow: true, replace: true }), SETTLE_MS);
  }

  /**
   * Takes on the address the URL shows, as after Back or an edited URL. A URL
   * can't tell the levels apart, so one that already names where the reader
   * is, or is going, is nothing new: this page's own navigations come back
   * here too, and must not trade the copy of a place the reader chose for
   * its copy in level 0.
   */
  arrive(address: Address): void {
    clearTimeout(this.#settling);
    if (href(address) !== this.href) this.here = address;
  }

  /** Moves through the tree of places: out to the parent, in to the first child, or across to a sibling. */
  step(direction: 'out' | 'in' | 'previous' | 'next'): void {
    const { place, level } = this.focus;
    const to = (next: Place, at = level) => this.go({ focus: { place: next, level: at }, bits: '' });
    if (direction === 'out') {
      // Out of the root is the root around it, which looks the same: the tree goes up forever.
      if (place.parent) to(place.parent as Place);
      else to(root, level - 1);
      return;
    }
    if (direction === 'in') {
      const first = place.children.find(isPlace);
      if (first) to(first);
      return;
    }
    if (!place.parent) return;
    const siblings = place.parent.children.filter(isPlace);
    const next = siblings[siblings.indexOf(place) + (direction === 'next' ? 1 : -1)];
    if (next) to(next);
  }
}

export const explorer = new Explorer();
