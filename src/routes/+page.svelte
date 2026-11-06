<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { startLive } from '#lib/live.svelte.ts';
  import AmbientMath from '#lib/components/AmbientMath.svelte';
  import Closing from '#lib/components/Closing.svelte';
  import Hero from '#lib/components/Hero.svelte';
  import Lab from '#lib/components/Lab.svelte';
  import Nav from '#lib/components/Nav.svelte';
  import Systems from '#lib/components/Systems.svelte';
  import Work from '#lib/components/Work.svelte';

  onMount(startLive);
</script>

<div class="noise" aria-hidden="true"></div>
<AmbientMath />
<Nav />

<main id="top">
  <Hero />
  <Work />
  <Lab />
  <Systems />
  <Closing />
</main>

<style>
  .noise {
    position: fixed; inset: 0; pointer-events: none; z-index: 30; opacity: .035;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 160 160' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.8'/%3E%3C/svg%3E");
  }
  :global(html[data-mirror-depth]) .noise { opacity: .018; }
  main { position: relative; z-index: 1; }
</style>
