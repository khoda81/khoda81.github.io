<nav class="nav shell">
  <a class="brand" href="#top" aria-label="Home">MK<span class="slash">/</span>bits</a>
  <div class="nav-links">
    <a href="#work">work</a>
    <a href="#lab">live lab</a>
    <a href="#systems">systems</a>
    <a href="https://github.com/khoda81" target="_blank" rel="noreferrer">github ↗</a>
  </div>
</nav>

<style>
  .nav {
    height: 70px; display: flex; align-items: center; justify-content: space-between;
    position: relative; z-index: 20; border-bottom: 1px solid var(--line);
  }
  .brand { font: 700 14px/1 var(--mono); letter-spacing: -.03em; }
  .slash { color: var(--green); margin: 0 3px; }
  .nav-links { display: flex; gap: 28px; font: 500 11px/1 var(--mono); text-transform: uppercase; letter-spacing: .08em; color: var(--muted); }
  .nav-links a:hover { color: var(--green); }

  @media (max-width: 720px) {
    .nav { height: 58px; }
    .nav-links { gap: 12px; }
    .nav-links a:nth-child(1), .nav-links a:nth-child(3) { display: none; }
  }
</style>
