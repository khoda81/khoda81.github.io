<script lang="ts">
  import Mirror from './Mirror.svelte';
  import Telemetry from './Telemetry.svelte';
</script>

<section class="hero shell">
  <div class="hero-copy">
    <p class="eyebrow">MAHDI KHODABANDEH · KHODA81 · ML / RL / SYSTEMS</p>
    <h1>I build systems that <em>spend bits carefully.</em></h1>
    <p class="lede">Compression, information theory, learning algorithms, market microstructure, and the visualization machinery that makes their internal state visible.</p>
    <div class="hero-links">
      <a class="primary" href="#work">decode portfolio ↓</a>
      <a href="https://github.com/khoda81" target="_blank" rel="noreferrer">github.com/khoda81 ↗</a>
    </div>
  </div>

  <div class="hero-instrument">
    <Mirror />
  </div>

  <Telemetry />
</section>

<style>
  .hero { min-height: calc(100vh - 70px); display: grid; grid-template-columns: .95fr 1.05fr; grid-template-rows: 1fr auto; gap: 42px 48px; padding: 72px 0 32px; align-items: center; }
  .hero-copy { max-width: 720px; }
  h1 { font-size: clamp(54px, 7vw, 112px); line-height: .91; letter-spacing: -.065em; font-weight: 620; margin-bottom: 34px; }
  .lede { color: #a5b3c6; font-size: clamp(18px, 1.55vw, 24px); line-height: 1.55; max-width: 760px; }
  .hero-instrument { position: relative; min-width: 0; }

  :global(html[data-mirror-depth]) .hero { min-height: 100vh; padding-top: 42px; }
  :global(html[data-mirror-depth]) h1 { font-size: clamp(44px, 6.4vw, 92px); }
  :global(html[data-mirror-depth]) .lede { font-size: clamp(15px, 1.3vw, 20px); }

  @media (max-width: 1050px) {
    .hero { grid-template-columns: 1fr; padding-top: 54px; }
  }

  @media (max-width: 720px) {
    .hero { min-height: auto; padding: 70px 0 20px; gap: 34px; }
    h1 { font-size: clamp(48px, 16vw, 76px); }
  }
</style>
