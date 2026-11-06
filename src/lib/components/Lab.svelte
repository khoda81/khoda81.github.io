<script lang="ts">
  /** One message's interval narrowing: each symbol keeps a sub-interval of the previous one. */
  const intervals = [
    { symbol: 'Σ', left: 0, width: 100, size: '1.000000' },
    { symbol: 'A', left: 9, width: 61, size: '0.610000' },
    { symbol: 'R', left: 29, width: 27, size: '0.164700' },
    { symbol: 'I', left: 36, width: 13, size: '0.021411' },
    { symbol: 'T', left: 40, width: 6, size: '0.001285' }
  ];
</script>

<section id="lab" class="section lab-section">
  <div class="shell">
    <header class="section-heading">
      <div><p class="eyebrow">INFORMATION LAB / 02</p><h2>Probability is just code length waiting to happen.</h2></div>
      <p>The visual language is shared with the compression work: quantiles, intervals, surprisal, and accumulated code length.</p>
    </header>

    <div class="lab-grid">
      <div class="lab-panel">
        <span class="project-topline"><span>QBAR</span><a class="qbar-demo-link" href="/qbar/" target="_blank" rel="noreferrer">standalone ↗</a></span>
        <div class="qbar-frame-wrap">
          <iframe title="QBar quantile rasterizer component" src="/qbar-demo/index.html?embed=fleet" loading="lazy" tabindex="-1"></iframe>
        </div>
        <strong>make uncertainty decide what deserves a pixel</strong>
        <small class="qbar-method">QBar starts from a quantile function, not a fixed axis. It evaluates probability boundaries at screen resolution, so every pixel owns equal probability mass. Human-friendly tick candidates are chosen in value space; opacity comes from how much pixel support that local interval receives. As uncertainty widens, weak ticks fade instead of snapping the scale around.</small>
        <div class="method-flow" aria-hidden="true"><span>p ∈ [0,1]</span><i>→</i><span>Q(p)</span><i>→</i><span>equal-mass pixels</span><i>→</i><span>nice ticks</span><i>→</i><span>visibility</span></div>
      </div>

      <div class="lab-panel">
        <span class="project-topline"><span>ARITHMETIC CODER</span><span>one message</span></span>
        <div class="coder-stack" aria-label="Arithmetic coding interval narrowing illustration">
          {#each intervals as { symbol, left, width, size } (symbol)}
            <div style:margin-left="{left}%" style:width="{width}%"><b>{symbol}</b><span>{size}</span></div>
          {/each}
        </div>
        <strong>symbols carve one nested interval</strong>
        <small>No mysterious resets here: a new [0,1) means a new message.</small>
      </div>

      <a class="lab-panel" href="https://github.com/khoda81/arithmetipy" target="_blank" rel="noreferrer">
        <span class="project-topline"><span>ARITHMETIPY</span><span>Rust → Python ↗</span></span>
        <div class="bitstream" aria-hidden="true">01100110100111001010110100101110<span>0110</span>001101</div>
        <strong>streaming arithmetic coding</strong>
        <small>32-bit encoder / decoder implemented in Rust, exposed through PyO3.</small>
      </a>
    </div>
  </div>
</section>

<style>
  .lab-section { background: #0a0f16; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
  .lab-grid { display: grid; grid-template-columns: 1.1fr .9fr .8fr; gap: 16px; }
  .lab-panel { min-height: 430px; border: 1px solid var(--line); padding: 22px; background: #0d131c; display: flex; flex-direction: column; transition: .18s ease; }
  a.lab-panel:hover { border-color: rgba(113,236,195,.45); transform: translateY(-1px); }
  .lab-panel > strong { font-size: 21px; letter-spacing: -.035em; margin-top: auto; }
  .lab-panel > small { color: var(--muted); line-height: 1.5; margin-top: 8px; }

  .qbar-frame-wrap { flex: 1; min-height: 210px; margin: 24px 0 22px; border: 1px solid var(--line); overflow: hidden; background: #090b10; }
  .qbar-frame-wrap iframe { width: 100%; height: 100%; min-height: 210px; display: block; border: 0; background: #090b10; pointer-events: none; }
  .qbar-method { font-size: 12px; }
  .qbar-demo-link { color: var(--green); }
  .method-flow { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 14px; font: 500 9px/1.2 var(--mono); color: #708199; }
  .method-flow span { border: 1px solid var(--line); padding: 5px 7px; }
  .method-flow i { color: var(--green); font-style: normal; align-self: center; }

  .coder-stack { flex: 1; display: grid; align-content: center; gap: 8px; padding: 24px 0; }
  .coder-stack > div { height: 36px; min-width: 18px; border: 1px solid rgba(113,236,195,.55); background: rgba(113,236,195,.07); display: flex; align-items: center; justify-content: space-between; padding: 0 8px; font: 500 9px/1 var(--mono); color: #7e91aa; overflow: hidden; }
  .coder-stack b { color: var(--green); }

  .bitstream { margin: 72px 0 30px; word-break: break-all; font: 500 clamp(22px, 3vw, 42px)/1.3 var(--mono); letter-spacing: .02em; color: #54667e; }
  .bitstream span { color: var(--yellow); }

  @media (max-width: 1050px) {
    .lab-grid { grid-template-columns: 1fr 1fr; }
    .lab-panel:last-child { grid-column: 1 / -1; }
  }

  @media (max-width: 720px) {
    .lab-grid { grid-template-columns: 1fr; }
    .lab-panel:last-child { grid-column: auto; }
  }

  @media (prefers-reduced-motion: reduce) {
    a.lab-panel:hover { transform: none; }
  }
</style>
