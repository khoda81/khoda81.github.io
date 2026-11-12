<script lang="ts">
  import { parse } from '#lib/explorer/address.ts';
  import { explorer } from '#lib/explorer/explorer.svelte.ts';

  /** The URL split at its hash: the place's path, and the codeword of the view inside it. */
  const parts = $derived.by(() => {
    const [path = '/', bits = ''] = explorer.href.split('#');
    return { path, bits };
  });

  /** Whether this edit already has its own history entry, so further keystrokes refine it instead of adding more. */
  let entered = false;

  /** Every keystroke decodes: the view flies to the bits typed so far. */
  function oninput(event: Event & { currentTarget: HTMLInputElement }) {
    const input = event.currentTarget;
    const bits = input.value.replace(/[^01]/g, '');
    input.value = bits;
    const address = parse(parts.path, bits);
    if (!address) throw new Error(`the scene's own path ${parts.path} names no place`);
    explorer.go(address, entered);
    entered = true;
  }

  function onkeydown(event: KeyboardEvent & { currentTarget: HTMLInputElement }) {
    if (event.key === 'Enter' || event.key === 'Escape') event.currentTarget.blur();
  }
</script>

<!-- The address reads as one string, MK/markets/#1011: home, the place's path, and the editable codeword inside it. -->
<div class="tape">
  <a class="home" href="/" aria-label="Home">MK</a>
  {#if explorer.focus.place.kind === 'project'}
    <!-- A project has nothing inside, so no codeword to show or type. -->
    <span class="path">{parts.path}</span>
  {:else}
    <label>
      <span class="path">{parts.path}#</span>
      <input
        value={parts.bits}
        {oninput}
        {onkeydown}
        onblur={() => (entered = false)}
        inputmode="numeric"
        spellcheck="false"
        autocomplete="off"
        placeholder="∅"
        style:width="{Math.max(parts.bits.length, 1) + .5}ch"
        aria-label="Codeword of the view inside {parts.path}"
      />
    </label>
  {/if}
</div>

<style>
  .tape { display: flex; align-items: baseline; min-width: 0; font: 600 14px/1 var(--mono); white-space: nowrap; }
  .home { flex: none; color: var(--text); font-weight: 700; }
  .home:hover { color: var(--green); }
  label { display: flex; align-items: baseline; min-width: 0; cursor: text; }
  /*
   * Short of room, the path gives way first, to a stub, and then the codeword, which scrolls within itself. The
   * stub is as wide as the shortest path, /#: any wider would open a gap between it and the bits.
   */
  .path { flex: 0 1000 auto; min-width: 2ch; overflow: hidden; text-overflow: ellipsis; color: var(--muted); }
  input {
    all: unset; flex: 0 1 auto; min-width: 4ch; box-sizing: content-box; max-width: 46ch; border-bottom: 1px solid transparent;
    color: var(--green); overflow: hidden; text-overflow: ellipsis;
  }
  input::placeholder { color: #4d5b6e; }
  input:hover { border-bottom-color: var(--line); }
  input:focus { border-bottom-color: var(--green); background: rgba(113,236,195,.06); }
</style>
