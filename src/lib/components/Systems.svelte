<script lang="ts">
  import { featured, systems } from '#lib/projects.ts';
</script>

<section id="systems" class="section shell">
  <header class="section-heading">
    <div><p class="eyebrow">UNDER THE PIXELS / 03</p><h2>Data structures, compression, search, and the machinery underneath.</h2></div>
    <p>Less spectacle here; more of the reasons the spectacle can stay responsive.</p>
  </header>
  <div class="systems-list">
    {#each systems as project, i (project.name)}
      <article>
        <div class="system-index">{String(featured.length + i + 1).padStart(2, '0')}</div>
        <div>
          <div class="project-topline"><span>{project.kind}</span><span>{project.unit}</span></div>
          <h3>{project.name}</h3>
          <p class="blurb">{project.description}</p>
        </div>
        <div class="system-links">
          {#if project.demo}<a href={project.demo} target="_blank" rel="noreferrer">live ↗</a>{/if}
          {#if project.repo}<a href={project.repo} target="_blank" rel="noreferrer">github ↗</a>{/if}
        </div>
      </article>
    {/each}
  </div>
</section>

<style>
  .systems-list { border-top: 1px solid var(--line); }
  article { display: grid; grid-template-columns: 72px 1fr auto; gap: 28px; padding: 28px 0; border-bottom: 1px solid var(--line); align-items: center; }
  .system-index { font: 500 11px/1 var(--mono); color: #536277; }
  h3 { margin: 9px 0 7px; font-size: 24px; }
  .blurb { margin-bottom: 0; max-width: 900px; }
  .system-links { display: flex; gap: 8px; }
  .system-links a { border: 1px solid var(--line); padding: 8px 10px; font: 600 9px/1 var(--mono); color: #91a0b5; }
  .system-links a:hover { color: var(--green); border-color: rgba(113,236,195,.4); }

  @media (max-width: 720px) {
    article { grid-template-columns: 42px 1fr; }
    .system-links { grid-column: 2; justify-self: start; }
  }
</style>
