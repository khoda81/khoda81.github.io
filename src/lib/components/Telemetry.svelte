<script lang="ts">
  import { PAGE_BITS } from '#lib/code.ts';
  import { explorer } from '#lib/explorer/explorer.svelte.ts';
  import { live } from '#lib/live.svelte.ts';

  const s = $derived(live.snapshot);
  const reading = $derived(explorer.reading);
  const camera = $derived(explorer.camera);

  /** A probability's binary expansion to `digits` places: the bits an arithmetic decoder would read. */
  function binary(p: number, digits: number): string {
    if (p < 0 || 1 <= p) return '—';
    return '.' + Math.floor(p * 2 ** digits).toString(2).padStart(digits, '0');
  }
</script>

<!-- Cells are listed from the most to the least wanted: the strip drops them from the end when it runs out of room. -->
<div class="telemetry" aria-label="Live page telemetry">
  <div style:--chars={15}><span>AGE</span><strong>{s.age.toFixed(10)} y</strong></div>
  <div style:--chars={26}>
    <span>POINTER</span>
    <strong>{reading ? `${binary(reading.p, 12)} · ${reading.bits.toFixed(2)} bits` : 'outside the code'}</strong>
  </div>
  <div style:--chars={20}><span>DEPTH</span><strong>{(camera.x + PAGE_BITS * camera.level).toFixed(2)} bits · page {camera.level}</strong></div>
  <div style:--chars={19}><span>FRAME</span><strong>{s.frame.toLocaleString('en-US')} · {s.fps.toFixed(0)} fps</strong></div>
</div>

<style>
  /*
   * One row by construction: every cell is as wide as its longest value, so
   * values never push each other, and the strip is exactly one cell tall, so a
   * cell that doesn't fit wraps into a row that isn't shown instead of adding one.
   */
  .telemetry { --row: 42px; display: flex; flex-wrap: wrap; justify-content: flex-end; height: var(--row); overflow: hidden; }
  .telemetry > div {
    box-sizing: border-box; height: var(--row); padding: 7px 10px; margin-left: -1px;
    border: 1px solid var(--line); background: rgba(8,11,16,.78); backdrop-filter: blur(8px);
  }
  span { display: block; font: 500 8px/1.3 var(--mono); color: #607086; letter-spacing: .1em; }
  strong {
    display: block; width: calc(var(--chars) * 1ch); margin-top: 3px; overflow: hidden; text-overflow: ellipsis;
    font: 600 11px/1.2 var(--mono); color: #d7e0ec; white-space: nowrap;
  }
</style>
