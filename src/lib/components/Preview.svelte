<script lang="ts">
  import type { Preview } from '#lib/catalog.ts';
  import QBarFleet from './QBarFleet.svelte';

  let { preview }: { preview: Preview } = $props();
</script>

<figure class="preview">
  {#if preview.kind === 'image'}
    <img src={preview.src} alt={preview.alt} loading="lazy" decoding="async" />
  {:else if preview.kind === 'live'}
    <iframe src={preview.src} title={preview.title} loading="lazy"></iframe>
  {:else}
    <QBarFleet />
  {/if}
</figure>

<style>
  .preview { margin: 22px 0 0; border: 1px solid var(--line); background: #090b10; overflow: hidden; }
  img { display: block; width: 100%; height: auto; }
  iframe { display: block; width: 100%; height: 380px; border: 0; background: var(--bg); }
</style>
