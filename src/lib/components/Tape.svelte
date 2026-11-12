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

<label class="tape">
  <span class="label">codeword</span>
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
    style:width="calc({Math.max(parts.bits.length, 1) * 1.06}ch + 1ch)"
    aria-label="Codeword of the view inside {parts.path}"
  />
  <span class="length">{parts.bits.length} bits</span>
</label>

<style>
  .tape { display: flex; align-items: center; gap: 8px; min-width: 0; margin: 0; font: 500 11px/1 var(--mono); color: var(--muted); cursor: text; }
  .label, .length { flex: none; font-size: 9px; letter-spacing: .1em; text-transform: uppercase; }
  .path { flex: none; font: 500 12px/1 var(--mono); color: #8392a6; }
  input {
    all: unset; box-sizing: content-box; min-width: 2ch; max-width: 46ch; padding: 3px 5px; border-bottom: 1px solid transparent;
    font: 600 13px/1 var(--mono); color: var(--green); letter-spacing: .06em; overflow: hidden; text-overflow: ellipsis;
  }
  input::placeholder { color: #4d5b6e; }
  input:hover { border-bottom-color: var(--line); }
  input:focus { border-bottom-color: var(--green); background: rgba(113,236,195,.06); }
</style>
