<script lang="ts">
  import { live } from '#lib/live.svelte.ts';
  import type { Project } from '#lib/projects.ts';

  let { project, index }: { project: Project; index: number } = $props();

  const BARS = 18;

  /** Bars are numbered across all cards so that no two cards move in step. */
  function barHeight(bar: number, t: number): number {
    const base = 20 + ((bar * 29) % 54);
    const motion = 14 * Math.sin(t * (.7 + (bar % 5) * .08) + bar * .73);
    return Math.max(8, Math.min(94, base + motion));
  }
</script>

<article class="project-card">
  <div class="project-topline"><span>{project.kind}</span><span>{project.unit}</span></div>
  <div class="signal-bars" aria-hidden="true">
    {#each { length: BARS }, j}
      <i style:height="{barHeight(index * BARS + j, live.snapshot.uptime)}%"></i>
    {/each}
  </div>
  <h3>{project.name}</h3>
  <p class="blurb">{project.description}</p>
  <div class="project-meta"><span>{project.signal}</span></div>
  <div class="actions compact">
    {#if project.demo}<a class="primary" href={project.demo} target="_blank" rel="noreferrer">live ↗</a>{/if}
    {#if project.repo}<a href={project.repo} target="_blank" rel="noreferrer">github ↗</a>{/if}
  </div>
</article>

<style>
  .project-card { position: relative; min-height: 390px; display: flex; flex-direction: column; border: 1px solid var(--line); padding: 24px; background: var(--panel); overflow: hidden; }
  .project-card:hover { border-color: rgba(113,236,195,.38); transform: translateY(-1px); transition: .18s ease; }
  .blurb { flex: 1; }
  .project-meta { font: 500 10px/1.2 var(--mono); color: #64758b; border-top: 1px solid var(--line); padding-top: 13px; }
  .signal-bars { height: 90px; display: flex; align-items: flex-end; gap: 4px; margin: 30px 0 3px; opacity: .85; }
  .signal-bars i { flex: 1; background: linear-gradient(to top, rgba(113,236,195,.08), rgba(113,236,195,.72)); min-width: 2px; }

  @media (prefers-reduced-motion: reduce) {
    .project-card:hover { transform: none; }
  }
</style>
