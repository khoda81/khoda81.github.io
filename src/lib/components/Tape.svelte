<script lang="ts">
  import { encode } from '#lib/code.ts';
  import { explorer } from '#lib/explorer/explorer.svelte.ts';

  /** The codeword as shown: it backs off to the common prefix, then types the new bits in, like a decoder. */
  let shown = $state('');
  const target = $derived(encode(explorer.focus));

  $effect(() => {
    const goal = target;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      shown = goal;
      return;
    }
    const timer = setInterval(() => {
      if (!goal.startsWith(shown)) shown = shown.slice(0, -1);
      else if (shown.length < goal.length) shown = goal.slice(0, shown.length + 1);
      else clearInterval(timer);
    }, 34);
    return () => clearInterval(timer);
  });

  const groups = $derived(shown.match(/.{1,4}/g) ?? []);
</script>

<p class="tape" aria-label="Codeword of this place: {target || 'empty'}">
  <span class="label">codeword</span>
  <code>{#each groups as group, i (i)}<span>{group}</span>{/each}<i class="cursor"></i></code>
  <span class="length">{target.length} bits</span>
</p>

<style>
  .tape { display: flex; align-items: center; gap: 10px; margin: 0; font: 500 11px/1 var(--mono); color: var(--muted); }
  .label, .length { font-size: 9px; letter-spacing: .1em; text-transform: uppercase; }
  code { display: flex; gap: 6px; align-items: center; min-height: 14px; font: 600 13px/1 var(--mono); color: var(--green); letter-spacing: .06em; }
  .cursor { width: 7px; height: 13px; background: var(--green); animation: blink 1.05s steps(1) infinite; }
  @keyframes blink { 50% { opacity: 0; } }
  @media (prefers-reduced-motion: reduce) { .cursor { animation: none; } }
</style>
