<script lang="ts">
  import { browser } from '$app/env';
  import { durationTicks } from '@qbar/qbar';
  import { defineQBar, type QBarElement } from '@qbar/qbar/element';
  import { live } from '#lib/live.svelte.ts';

  if (browser) defineQBar();

  const scale = durationTicks();

  /** Simulated latency forecasts, in ms, whose medians wander around `base`. */
  const services = [
    { name: 'Search API', region: 'fra-1', color: '#ff9eb5', base: 82, phase: .2 },
    { name: 'Checkout', region: 'ams-2', color: '#76d7ff', base: 138, phase: 1.4 },
    { name: 'Vector index', region: 'hel-1', color: '#c9a7ff', base: 205, phase: 2.6 },
    { name: 'Media edge', region: 'global', color: '#8de8b2', base: 44, phase: 3.7 }
  ];

  /** Log-logistic latency with the given median; unbounded above, so Q(1) = ∞. */
  function latency(median: number): (p: number) => number {
    const SHAPE = 7;
    return p => median * (p / (1 - p)) ** (1 / SHAPE);
  }

  function median({ base, phase }: (typeof services)[number], t: number): number {
    return base * (1 + .14 * Math.sin(t * .72 + phase) + .05 * Math.sin(t * 2.1 + phase));
  }
</script>

<div class="fleet">
  <div class="fleet-head"><b>service latency forecasts</b><span>P0 → P100 · simulated telemetry</span></div>
  {#each services as service (service.name)}
    {@const quantile = latency(median(service, live.snapshot.uptime))}
    <div class="service">
      <div class="name">{service.name}<small>{service.region}</small></div>
      <q-bar
        orientation="horizontal"
        style:color={service.color}
        {@attach (bar: QBarElement) => {
          bar.scale = scale;
          bar.quantile = quantile;
        }}
      ></q-bar>
      <output class="p95">{Math.round(quantile(.95))} ms</output>
    </div>
  {/each}
</div>

<style>
  .fleet { padding: 10px 12px; }
  .fleet-head { display: flex; justify-content: space-between; gap: 18px; align-items: center; padding-bottom: 9px; border-bottom: 1px solid var(--line); font: 500 10px/1.2 var(--mono); color: var(--muted); }
  .fleet-head b { color: var(--green); font-weight: 600; }
  .service { display: grid; grid-template-columns: 92px minmax(120px, 1fr) 58px; gap: 9px; align-items: center; min-height: 46px; border-bottom: 1px solid var(--line); }
  .service:last-child { border-bottom: 0; }
  .name { font: 600 8px/1.25 var(--mono); }
  .name small { display: block; color: var(--muted); font-weight: 500; margin-top: 5px; }
  .p95 { text-align: right; font: 600 8px/1 var(--mono); color: #cbd7e6; }
  q-bar { display: block; width: 100%; height: 38px; font: 500 9px/1 var(--mono); }
</style>
