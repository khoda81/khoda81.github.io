<script lang="ts">
  import '../../app.css';
  import { browser } from '$app/env';
  import { afterNavigate } from '$app/navigation';
  import { onMount } from 'svelte';
  import Panel from '#lib/components/Panel.svelte';
  import Tape from '#lib/components/Tape.svelte';
  import Telemetry from '#lib/components/Telemetry.svelte';
  import { pathOf, root, type Place } from '#lib/code.ts';
  import { parse } from '#lib/explorer/address.ts';
  import { explorer } from '#lib/explorer/explorer.svelte.ts';
  import Scene from '#lib/explorer/Scene.svelte';
  import { startLive } from '#lib/live.svelte.ts';

  let { data }: { data: { place: Place } } = $props();

  /** The address in the URL bar; the route's own place when prerendering, which has no hash. */
  const fromUrl = () => (browser && parse(location.pathname, location.hash)) || { focus: { place: data.place, level: 0 }, bits: '' };
  explorer.arrive(fromUrl());
  // Links, Back, and an edited hash all change the URL without this page asking; it reads where they led.
  afterNavigate(() => explorer.arrive(fromUrl()));

  /** The place this URL is about, for search engines and link previews. */
  const named = $derived(explorer.focus.level === 0 ? explorer.focus.place : root);
  const title = $derived(named.kind === 'root' ? 'Mahdi Khodabandeh (khoda81) — ML, Compression & Systems' : `${named.kind === 'theme' ? named.theme.name : named.project.name} — Mahdi Khodabandeh (khoda81)`);
  const canonical = $derived(`https://khoda81.github.io${pathOf(named)}`);

  const keys: Record<string, () => void> = {
    ArrowLeft: () => explorer.step('out'),
    ArrowRight: () => explorer.step('in'),
    ArrowUp: () => explorer.step('previous'),
    ArrowDown: () => explorer.step('next'),
    Escape: () => explorer.go({ focus: { place: root, level: 0 }, bits: '' })
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
    // Back and Forward between this page's own entries are shallow, so no navigation reports them.
    const sync = () => explorer.arrive(fromUrl());
    addEventListener('popstate', sync);
    addEventListener('hashchange', sync);
    const stop = startLive();
    return () => {
      removeEventListener('popstate', sync);
      removeEventListener('hashchange', sync);
      stop();
    };
  });
</script>

<svelte:head>
  <title>{title}</title>
  <link rel="canonical" href={canonical} />
  <meta property="og:url" content={canonical} />
  <meta property="og:title" content={title} />
</svelte:head>

<svelte:window {onkeydown} />

<div class="app">
  <main class="stage">
    <Scene />
    <header class="top">
      <a class="brand" href="/" aria-label="Home">MK<span>/</span>bits</a>
      <Tape />
      <div class="telemetry"><Telemetry /></div>
    </header>
  </main>
  <Panel />
</div>

<style>
  .app { display: grid; grid-template-columns: minmax(0, 1fr) min(460px, 38vw); height: 100svh; }
  /*
   * Beside the scene, the panel scrolls on its own and keeps its scroll from reaching the page. On a phone the scene
   * stays put and the page scrolls the panel up over it, so the panel must not be a scroll container at all: one with
   * `overscroll-behavior: contain` holds a swipe even with nothing to scroll, and the scene takes every touch for
   * itself, so nothing would scroll the page.
   */
  .app > :global(.panel) { overflow-y: auto; overscroll-behavior: contain; scrollbar-width: thin; border-left: 1px solid var(--line); }
  .stage { position: relative; min-width: 0; display: grid; }
  .stage > :global(.scene) { grid-area: 1 / 1; }
  /* Its height is the scene's TOP inset. */
  .top { position: absolute; top: 0; left: 0; right: 76px; height: 56px; display: flex; align-items: center; gap: 22px; padding: 0 12px 0 20px; pointer-events: none; background: linear-gradient(to bottom, rgba(8,11,16,.9), rgba(8,11,16,.4)); }
  .top > :global(*) { pointer-events: auto; }
  .brand { flex: none; white-space: nowrap; font: 700 14px/1 var(--mono); letter-spacing: -.03em; }
  .brand span { color: var(--green); margin: 0 3px; }
  /* The codeword keeps its room; the telemetry takes what is left and drops the cells that don't fit. */
  .telemetry { flex: 1 1 0; min-width: 0; }

  :global(body) { overflow: hidden; }

  @media (max-width: 900px) {
    :global(body) { overflow: auto; }
    .app { display: block; height: auto; }
    .app > :global(.panel) {
      position: relative; overflow-y: visible; overscroll-behavior: auto;
      border-left: none; border-top: 1px solid var(--line); border-radius: 16px 16px 0 0; box-shadow: 0 -16px 40px rgba(0, 0, 0, .5);
    }
    .stage { position: sticky; top: 0; height: 68svh; }
    .top { right: 64px; padding: 0 14px; gap: 14px; }
    .telemetry { display: none; }
  }
</style>
