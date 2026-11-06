<script lang="ts">
  import { featured } from '#lib/projects.ts';
  import ProjectCard from './ProjectCard.svelte';
</script>

<section id="work" class="section shell">
  <header class="section-heading">
    <div><p class="eyebrow">SELECTED SIGNALS / 01</p><h2>Things that are better <em>watched</em> than described.</h2></div>
    <p>Every project keeps its real GitHub URL beside it. Live deployments get an explicit launch link.</p>
  </header>

  <article class="feature-card">
    <div class="feature-copy">
      <div class="project-topline"><span>LIVE · MARKET + NEWS</span><span>Δlog(price)</span></div>
      <h3>Chronickle</h3>
      <p class="blurb">A multi-source market timeline with price heatmaps, a shared time axis, data-acquisition telemetry, retries, sockets, and real-world news events.</p>
      <div class="actions">
        <a class="primary" href="https://khoda81.github.io/chronickle/" target="_blank" rel="noreferrer">open live ↗</a>
        <a href="https://github.com/khoda81/chronickle" target="_blank" rel="noreferrer">source ↗</a>
      </div>
    </div>
    <div class="live-frame-wrap">
      <div class="live-frame-header"><span>khoda81.github.io/chronickle</span><span class="pulse">● live</span></div>
      <iframe title="Chronickle live preview" src="https://khoda81.github.io/chronickle/" loading="lazy"></iframe>
    </div>
  </article>

  <div class="project-grid">
    {#each featured as project, index (project.name)}
      <ProjectCard {project} {index} />
    {/each}
  </div>
</section>

<style>
  .feature-card { border: 1px solid var(--line); background: var(--panel); display: grid; grid-template-columns: .72fr 1.28fr; margin-bottom: 16px; overflow: hidden; }
  .feature-copy { padding: clamp(28px, 4vw, 64px); display: flex; flex-direction: column; justify-content: center; }
  .live-frame-wrap { min-width: 0; background: #06090d; border-left: 1px solid var(--line); padding: 12px; }
  .live-frame-wrap iframe { width: 100%; height: 620px; display: block; border: 1px solid var(--line); background: #080b10; }
  .project-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }

  @media (max-width: 1050px) {
    .feature-card { grid-template-columns: 1fr; }
    .live-frame-wrap { border-left: 0; border-top: 1px solid var(--line); }
    .project-grid { grid-template-columns: repeat(2, 1fr); }
  }

  @media (max-width: 720px) {
    .project-grid { grid-template-columns: 1fr; }
    .live-frame-wrap iframe { height: 520px; }
  }
</style>
