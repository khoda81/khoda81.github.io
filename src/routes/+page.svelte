<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import Panel from '#lib/components/Panel.svelte';
  import Tape from '#lib/components/Tape.svelte';
  import Telemetry from '#lib/components/Telemetry.svelte';
  import { root } from '#lib/code.ts';
  import { explorer, fromHash, same } from '#lib/explorer/explorer.svelte.ts';
  import Scene from '#lib/explorer/Scene.svelte';
  import { startLive } from '#lib/live.svelte.ts';

  const keys: Record<string, () => void> = {
    ArrowLeft: () => explorer.step('out'),
    ArrowRight: () => explorer.step('in'),
    ArrowUp: () => explorer.step('previous'),
    ArrowDown: () => explorer.step('next'),
    Escape: () => explorer.go({ place: root, level: 0 })
  };

  function onkeydown(event: KeyboardEvent) {
    const action = keys[event.key];
    // Arrow keys belong to whatever has focus, unless that is nothing in particular.
    const free = document.activeElement === document.body || event.key === 'Escape';
    if (!action || !free || event.altKey || event.ctrlKey || event.metaKey) return;
    event.preventDefault();
    action();
  }

  onMount(() => {
    const sync = () => {
      const focus = fromHash(location.hash);
      if (focus && !same(focus, explorer.focus)) explorer.focus = focus;
    };
    sync();
    addEventListener('hashchange', sync);
    const stop = startLive();
    return () => {
      removeEventListener('hashchange', sync);
      stop();
    };
  });
</script>

<svelte:window {onkeydown} />

<div class="app">
  <main class="stage">
    <Scene />
    <header class="top">
      <a class="brand" href="#00000" aria-label="Home">MK<span>/</span>bits</a>
      <Tape />
      <div class="telemetry"><Telemetry /></div>
    </header>
  </main>
  <Panel />
</div>

<style>
  .app { display: grid; grid-template-columns: minmax(0, 1fr) min(460px, 38vw); height: 100svh; }
  .stage { position: relative; min-width: 0; display: grid; }
  .stage > :global(.scene) { grid-area: 1 / 1; }
  /* Its height is the scene's TOP inset. */
  .top { position: absolute; top: 0; left: 0; right: 76px; height: 56px; display: flex; align-items: center; gap: 22px; padding: 0 12px 0 20px; pointer-events: none; background: linear-gradient(to bottom, rgba(8,11,16,.9), rgba(8,11,16,.4)); }
  .top > :global(*) { pointer-events: auto; }
  .brand { font: 700 14px/1 var(--mono); letter-spacing: -.03em; }
  .brand span { color: var(--green); margin: 0 3px; }
  .telemetry { margin-left: auto; min-width: 0; overflow: hidden; }

  @media (max-width: 1320px) {
    .telemetry :global(.telemetry > div:nth-child(2)) { display: none; }
  }

  :global(body) { overflow: hidden; }

  @media (max-width: 900px) {
    :global(body) { overflow: auto; }
    .app { display: block; height: auto; }
    .stage { height: 68svh; }
    .top { right: 64px; padding: 0 14px; gap: 14px; }
    .telemetry { display: none; }
  }
</style>
