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

<div class="telemetry" aria-label="Live page telemetry">
  <div><span>AGE</span><strong>{s.age.toFixed(10)} y</strong></div>
  <div><span>FRAME</span><strong>{s.frame.toLocaleString('en-US')} · {s.fps.toFixed(0)} fps</strong></div>
  <div>
    <span>POINTER</span>
    <strong>{reading ? `${binary(reading.p, 12)} · ${reading.bits.toFixed(2)} bits` : 'outside the code'}</strong>
  </div>
  <div><span>DEPTH</span><strong>{(camera.x + PAGE_BITS * camera.level).toFixed(2)} bits · page {camera.level}</strong></div>
</div>

<style>
  .telemetry { display: flex; flex-wrap: wrap; gap: 0; border: 1px solid var(--line); background: rgba(8,11,16,.78); backdrop-filter: blur(8px); }
  .telemetry > div { padding: 7px 10px; border-right: 1px solid var(--line); min-width: 0; }
  .telemetry > div:last-child { border-right: 0; }
  span { display: block; font: 500 8px/1.3 var(--mono); color: #607086; letter-spacing: .1em; }
  strong { display: block; margin-top: 3px; font: 600 11px/1.2 var(--mono); color: #d7e0ec; white-space: nowrap; }
</style>
