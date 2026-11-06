<script lang="ts">
  import { live } from '#lib/live.svelte.ts';

  const s = $derived(live.snapshot);
</script>

<div class="telemetry" aria-label="Live page telemetry">
  <div><span>AGE</span><strong>{s.age.toFixed(12)} y</strong><small>Tehran birthday clock</small></div>
  <div><span>UPTIME</span><strong>{s.uptime.toFixed(6)} s</strong><small>page-local clock</small></div>
  <div><span>FRAME</span><strong>{s.frame.toLocaleString('en-US')}</strong><small>{s.fps.toFixed(1)} fps smoothed</small></div>
  <div>
    <span>POINTER</span>
    <strong>{s.pointer ? `${Math.round(s.pointer.x)},${Math.round(s.pointer.y)}` : '—'} · {(s.pointer?.speed ?? 0).toFixed(0)} px/s</strong>
    <small>position · speed</small>
  </div>
  <div><span>SCROLL</span><strong>{s.scroll.y.toFixed(0)} · {s.scroll.velocity.toFixed(0)} px/s</strong><small>position · velocity</small></div>
</div>

<style>
  .telemetry { grid-column: 1 / -1; display: grid; grid-template-columns: 1.15fr repeat(4, 1fr); border: 1px solid var(--line); background: rgba(8,11,16,.8); }
  .telemetry > div { min-width: 0; padding: 11px 13px; border-right: 1px solid var(--line); }
  .telemetry > div:last-child { border-right: 0; }
  span, small { display: block; font: 500 9px/1.35 var(--mono); color: #607086; letter-spacing: .08em; }
  strong { display: block; margin: 4px 0 2px; font: 600 12px/1.2 var(--mono); color: #d7e0ec; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  @media (max-width: 1050px) {
    .telemetry { grid-template-columns: repeat(2, 1fr); }
    .telemetry > div { border-bottom: 1px solid var(--line); }
  }

  @media (max-width: 720px) {
    .telemetry { grid-template-columns: 1fr 1fr; }
    .telemetry > div:first-child { grid-column: 1 / -1; }
  }
</style>
