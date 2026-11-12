<script lang="ts">
  import { entropy, lineage, name, root, spanAt, type Node, type Place, type ProjectNode, type ThemeNode } from '#lib/code.ts';
  import { href as hrefOf, type Address } from '#lib/explorer/address.ts';
  import { explorer } from '#lib/explorer/explorer.svelte.ts';
  import { colorOf } from '#lib/palette.ts';
  import Preview from './Preview.svelte';

  const focus = $derived(explorer.focus);
  const place = $derived(focus.place);
  const blend = $derived(explorer.measure === 'effort' ? 1 : 0);
  const trail = $derived(lineage(place) as Place[]);
  const themeNodes = root.children.filter((n): n is ThemeNode => n.kind === 'theme');
  const projectsOf = (theme: ThemeNode) => theme.children.filter((n): n is ProjectNode => n.kind === 'project');

  const probability = (node: Node) => {
    const s = spanAt(node, blend);
    return s.hi - s.lo;
  };
  const stats = $derived.by(() => {
    if (place.kind === 'root') return null;
    const P = probability(place);
    // A project is a leaf: nothing inside it is left to choose.
    return { p: P / probability(place.parent!), bits: -Math.log2(P), H: place.kind === 'project' ? null : entropy(place, blend) };
  });

  /** The index navigates at the current depth, so reading inside the page stays inside it. */
  const at = (target: Place): Address => ({ focus: { place: target, level: focus.level }, bits: '' });
  const href = (target: Place) => hrefOf(at(target), blend);

  function go(event: MouseEvent, target: Place) {
    event.preventDefault();
    explorer.go(at(target));
  }
</script>

<aside class="panel">
  <nav class="trail" aria-label="Where you are">
    {#if focus.level}<span class="depth">{focus.level === 1 ? 'inside this page' : `${focus.level} pages deep`} /</span>{/if}
    {#each trail as node, i (node.id)}
      {#if i}<span class="sep">/</span>{/if}
      <a href={href(node)} onclick={event => go(event, node)} aria-current={node === place ? 'location' : undefined}>{name(node)}</a>
    {/each}
  </nav>

  <article class="focus" style:--accent={colorOf(place)}>
    {#if place.kind === 'root'}
      <p class="eyebrow">MAHDI KHODABANDEH · KHODA81 · ML / RL / SYSTEMS</p>
      <h1>I build systems that <em>spend bits carefully.</em></h1>
      <p class="lede">Compression, information theory, learning algorithms, market microstructure, and the visualization machinery that makes their internal state visible.</p>
      <p class="how">
        This page is an arithmetic code. Each project gets a slice of [0, 1) as tall as the attention I’d give it,
        and reaching it costs −log₂ of that in bits, so the wider a box, the more surprising it is.
        <b>Scroll</b> to read more bits, <b>drag</b> to move, <b>click</b> to decode; the arrow keys walk the tree.
        The URL names the place you’re in, and its <code>#bits</code> are the biggest dyadic interval of it on screen;
        type your own in the header to go there. The last sixteenth, <code>1111</code>, is this page, so it contains itself.
      </p>
      {#if focus.level}
        <p class="how">You are {focus.level === 1 ? 'one page' : `${focus.level} pages`} deep: every <code>1111</code> at the front of the bits is another trip through it.</p>
      {/if}
      <div class="links">
        <a href="https://github.com/khoda81" target="_blank" rel="noreferrer">GitHub ↗</a>
        <a href="https://www.linkedin.com/in/mahdi-khodabandeh-681037249" target="_blank" rel="noreferrer">LinkedIn ↗</a>
        <a href="https://twitter.com/axiom_the_ai" target="_blank" rel="noreferrer">X / Twitter ↗</a>
      </div>
    {:else if place.kind === 'theme'}
      <p class="eyebrow">THEME</p>
      <h2>{place.theme.name}</h2>
      <p class="lede">{place.theme.summary}</p>
    {:else}
      <p class="eyebrow">{place.project.kind}</p>
      <h2>{place.project.name}</h2>
      <p class="lede">{place.project.summary}</p>
      {#if place.project.links.length}
        <div class="links">
          {#each place.project.links as link (link.href)}
            <a href={link.href} target="_blank" rel="noreferrer">{link.label} ↗</a>
          {/each}
        </div>
      {/if}
      {#if place.project.preview}
        {#key place}<Preview preview={place.project.preview} />{/key}
      {/if}
    {/if}

    {#if stats}
      <dl class="stats">
        <div><dt>p given parent</dt><dd>{stats.p.toFixed(3)}</dd></div>
        <div><dt>−log₂ P</dt><dd>{stats.bits.toFixed(2)} bits</dd></div>
        {#if stats.H !== null}<div><dt>H of what’s inside</dt><dd>{stats.H.toFixed(2)} bits</dd></div>{/if}
        {#if place.kind === 'project' && place.project.commits}
          <div><dt>commits</dt><dd>{place.project.commits.toLocaleString('en-US')}</dd></div>
        {/if}
      </dl>
    {/if}
  </article>

  <section class="index" aria-labelledby="index-title">
    <div class="index-head">
      <h3 id="index-title">Index</h3>
      <div class="measure" role="group" aria-label="Size boxes by">
        <button aria-pressed={explorer.measure === 'emphasis'} onclick={() => (explorer.measure = 'emphasis')}>attention</button>
        <button aria-pressed={explorer.measure === 'effort'} onclick={() => (explorer.measure = 'effort')}>commits</button>
      </div>
    </div>
    <p class="measure-note">
      {explorer.measure === 'emphasis'
        ? 'Boxes are sized by what I’d show you first.'
        : 'Boxes are sized by where the commits actually went.'}
    </p>
    {#each themeNodes as theme (theme.id)}
      <div class="theme" style:--accent={colorOf(theme)}>
        <a class="row theme-row" href={href(theme)} onclick={event => go(event, theme)} aria-current={theme === place ? 'location' : undefined}>
          <span class="row-name">{theme.theme.name}</span>
          <span class="bits">{(-Math.log2(probability(theme))).toFixed(1)}b</span>
          <i class="bar" style:width="{probability(theme) * 100}%"></i>
        </a>
        <ul>
          {#each projectsOf(theme) as project (project.id)}
            <li>
              <a class="row" href={href(project)} onclick={event => go(event, project)} aria-current={project === place ? 'location' : undefined}>
                <span class="row-name">{project.project.name}</span>
                <span class="kind">{project.project.kind}</span>
                <span class="bits">{(-Math.log2(probability(project))).toFixed(1)}b</span>
                <span class="summary">{project.project.summary}</span>
              </a>
            </li>
          {/each}
        </ul>
      </div>
    {/each}
  </section>
</aside>

<style>
  .panel { display: flex; flex-direction: column; gap: 26px; padding: 22px 24px 40px; border-left: 1px solid var(--line); background: #0a0e15; overflow-y: auto; overscroll-behavior: contain; scrollbar-width: thin; }

  .trail { display: flex; flex-wrap: wrap; gap: 6px; font: 500 10px/1.4 var(--mono); color: var(--muted); }
  .trail a:hover, .trail a[aria-current] { color: var(--green); }
  .sep, .depth { color: #4d5b6e; }

  .focus { --accent: var(--green); }
  .eyebrow { font: 600 10px/1.4 var(--mono); letter-spacing: .11em; color: var(--accent); margin: 0 0 12px; }
  h1 { font-size: clamp(36px, 3.4vw, 54px); line-height: .94; letter-spacing: -.06em; font-weight: 620; margin: 0 0 18px; }
  h1 em { color: var(--green); font-style: normal; }
  h2 { font-size: clamp(30px, 2.6vw, 42px); line-height: 1; letter-spacing: -.05em; font-weight: 600; margin: 0 0 14px; }
  .lede { color: #a9b6c8; font-size: 15px; line-height: 1.6; margin: 0; }
  .how { color: #8392a6; font-size: 13px; line-height: 1.65; margin: 16px 0 0; }
  .how b { color: #cfd9e6; font-weight: 600; }
  code { font-family: var(--mono); color: var(--green); }

  .links { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 20px; }
  .links a { border: 1px solid var(--line); padding: 9px 12px; border-radius: 4px; font: 600 11px/1 var(--mono); color: #bdc9da; }
  .links a:first-child { background: var(--accent); border-color: var(--accent); color: #05100c; }
  .links a:hover { border-color: var(--accent); color: var(--accent); }
  .links a:first-child:hover { color: #05100c; filter: brightness(1.1); }

  .stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1px; margin: 22px 0 0; background: var(--line); border: 1px solid var(--line); }
  .stats div { background: #0a0e15; padding: 9px 11px; }
  dt { font: 500 9px/1.3 var(--mono); color: #607086; letter-spacing: .06em; }
  dd { margin: 4px 0 0; font: 600 13px/1.2 var(--mono); color: #dfe7f1; }

  .index { border-top: 1px solid var(--line); padding-top: 18px; }
  .index-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
  h3 { font: 600 10px/1 var(--mono); letter-spacing: .12em; text-transform: uppercase; color: var(--muted); margin: 0; }
  .measure { display: flex; border: 1px solid var(--line); border-radius: 4px; overflow: hidden; }
  .measure button { all: unset; cursor: pointer; padding: 6px 9px; font: 600 10px/1 var(--mono); color: var(--muted); }
  .measure button[aria-pressed='true'] { background: var(--green); color: #05100c; }
  .measure button:focus-visible { outline: 2px solid var(--green); outline-offset: -2px; }
  .measure-note { margin: 10px 0 14px; font: 500 10px/1.5 var(--mono); color: #66768b; }

  .theme { --accent: var(--green); margin-bottom: 14px; }
  .row { position: relative; display: grid; grid-template-columns: minmax(0, 1fr) auto; column-gap: 10px; padding: 7px 8px; border-radius: 3px; }
  .row:hover, .row[aria-current] { background: rgba(145,166,196,.07); }
  .row[aria-current] .row-name { color: var(--accent); }
  .theme-row { font-weight: 600; font-size: 14px; letter-spacing: -.02em; }
  .bar { position: absolute; left: 8px; bottom: 2px; height: 2px; max-width: calc(100% - 16px); background: var(--accent); opacity: .6; transition: width .9s cubic-bezier(.2,.7,.2,1); }
  ul { list-style: none; margin: 2px 0 0; padding: 0 0 0 12px; border-left: 1px solid color-mix(in srgb, var(--accent) 35%, transparent); }
  .row-name { font-size: 13px; color: #dfe7f1; }
  .kind { grid-row: 2; font: 500 8.5px/1.6 var(--mono); letter-spacing: .08em; color: color-mix(in srgb, var(--accent) 75%, #8190a4); }
  .bits { grid-column: 2; grid-row: 1; font: 500 10px/1.6 var(--mono); color: #66768b; }
  .summary { grid-row: 3; grid-column: 1 / -1; font-size: 11.5px; line-height: 1.45; color: #738298; display: -webkit-box; -webkit-line-clamp: 1; line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }

  @media (prefers-reduced-motion: reduce) { .bar { transition: none; } }
</style>
