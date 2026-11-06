<script lang="ts">
  import { onMount } from 'svelte';
  import { mirrorDepth } from '#lib/live.svelte.ts';

  /** URL of the next mirror level: undefined until mounted, null where nesting stops. */
  let childSrc = $state<string | null>();

  onMount(() => {
    // Every level is a whole page; stop before it is too small to see or too heavy to run.
    const depth = mirrorDepth();
    if ((topViewportWidth() <= 720 ? 4 : 6) <= depth) {
      childSrc = null;
      return;
    }
    const next = new URL(location.href);
    next.searchParams.set('mirror', String(depth + 1));
    next.hash = '';
    childSrc = `${next.pathname}${next.search}`;
  });

  function topViewportWidth(): number {
    try {
      return window.top!.innerWidth;
    } catch {
      return innerWidth; // embedded by another origin
    }
  }
</script>

<div class="mirror-shell">
  <div class="live-frame-header"><span>this page / live mirror</span><span class="pulse">● same state</span></div>
  <div class="mirror-viewport" class:mirror-terminal={childSrc === null}>
    {#if childSrc}
      <iframe src={childSrc} title="Recursive live mirror of this portfolio" aria-hidden="true" tabindex="-1"></iframe>
    {/if}
  </div>
  <div class="mirror-note">
    <span><b>The page observes itself.</b> Scroll state and live telemetry propagate inward; interaction stays outside.</span>
    <span>picture-in-picture, recursively</span>
  </div>
</div>

<style>
  .mirror-shell { border: 1px solid var(--line); background: #080b10; overflow: hidden; }
  .mirror-shell .live-frame-header { padding: 10px 12px; border-bottom: 1px solid var(--line); }
  .mirror-viewport { position: relative; height: min(53vh, 560px); min-height: 390px; overflow: hidden; background: #080b10; }
  iframe {
    position: absolute; inset: 0 auto auto 0; width: 172.5%; height: 172.5%; border: 0; display: block;
    transform: scale(.58); transform-origin: 0 0; pointer-events: none; background: #080b10;
  }
  .mirror-viewport::after {
    content: ''; position: absolute; inset: 0; pointer-events: none;
    box-shadow: inset 0 0 80px rgba(8,11,16,.28); border: 1px solid rgba(113,236,195,.06);
  }
  .mirror-terminal::before { content: '↘  ↘  ↘'; position: absolute; inset: 0; display: grid; place-items: center; color: rgba(113,236,195,.35); font: 500 28px/1 var(--mono); letter-spacing: .8em; }
  .mirror-note { display: grid; grid-template-columns: 1fr auto; gap: 18px; align-items: center; padding: 10px 12px; border-top: 1px solid var(--line); font: 500 10px/1.4 var(--mono); color: var(--muted); }
  .mirror-note b { color: #ced8e6; font-weight: 600; }
  .mirror-note span:last-child { color: var(--green); }
  :global(html[data-mirror-depth]) .mirror-note { font-size: 9px; }

  @media (max-width: 720px) {
    .mirror-viewport { min-height: 360px; height: 52vh; }
    iframe { width: 190%; height: 190%; transform: scale(.5263); }
    .mirror-note { grid-template-columns: 1fr; }
  }
</style>
