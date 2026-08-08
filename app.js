const projects = [
  {
    name: 'Order-book Ball', kind: 'MARKET MICROSTRUCTURE',
    description: 'A causal price estimator that moves only when the executable bid/ask interval reaches it, with a temporal-spread hitting-time field.',
    repo: 'https://github.com/khoda81/orderbook-ball', signal: 'bid / ask / wall age', unit: 'q = ln(A/A′)'
  },
  {
    name: 'Vertical Epoching', kind: 'ML RESEARCH',
    description: 'Adaptive optimization depth: keep spending gradient updates on a batch while fresh unseen evidence says the extra compute still transfers.',
    repo: 'https://github.com/khoda81/vertical-epoching', signal: 'selector / audit / queue', unit: 'preq. nats'
  },
  {
    name: 'QBar', kind: 'PROBABILITY VISUALIZATION',
    description: 'A pixel-resolution quantile rasterizer: every CSS pixel owns equal probability mass, while human-friendly ticks fade according to local uncertainty.',
    demo: './qbar/', signal: 'quantile / tick family / visibility', unit: 'Q(p)'
  },
  {
    name: '2048 Solver', kind: 'RUST + SEARCH',
    description: 'A portable-SIMD Rust 2048 engine with deadline-bounded search and an agent that continuously turns compute into better actions.',
    repo: 'https://github.com/khoda81/rust-2048-solver', signal: 'search / score / depth', unit: 'ms / move'
  },
  {
    name: 'Better 3D Graph', kind: 'INTERACTIVE GRAPH',
    description: 'A Three.js / ngraph Obsidian plugin for navigating a force-directed knowledge graph in 3D.',
    repo: 'https://github.com/khoda81/obsidian-better-graph-3d', signal: 'nodes / edges / kinetic energy', unit: 'frame'
  },
  {
    name: 'time-series-cache', kind: 'RUST DATA STRUCTURE',
    description: 'An augmented deterministic treap for strict predecessor/successor queries, range extrema, and targeted renderer invalidation.',
    repo: 'https://github.com/khoda81/time-series-cache', signal: 'insert / range / subscribers', unit: 'O(log n)'
  },
  {
    name: 'LogVec', kind: 'CACHE-AWARE SYSTEMS',
    description: 'A Bentley–Saxe logarithmic data structure in one contiguous Vec, using binary-sized sorted runs and zero-allocation merges.',
    repo: 'https://github.com/khoda81/logvec', signal: 'runs / merges / hits', unit: 'µs'
  },
  {
    name: 'Arithmetipy', kind: 'COMPRESSION',
    description: 'Streaming arithmetic encoder/decoder implemented in Rust and exposed to Python through PyO3.',
    repo: 'https://github.com/khoda81/arithmetipy', signal: 'interval / symbols', unit: 'bits'
  },
  {
    name: 'DETHCOD', kind: 'COMPRESSION RESEARCH',
    description: 'Experimental transformer-based lossless compression with a learned discrete bottleneck and reinforcement-learning formulations.',
    repo: 'https://github.com/khoda81/dethcod', signal: 'tokens / code length', unit: 'bits / byte'
  },
  {
    name: 'Harmon', kind: 'CHESS + ML',
    description: 'Transformer-based chess work centered on modeling human moves, mistakes, player strength, and game outcomes.',
    repo: 'https://github.com/khoda81/harmon', signal: 'move distribution', unit: '−ln p(move)'
  },
  {
    name: 'Path Follower', kind: 'OLDER INTERACTIVE',
    description: 'A small browser experiment that still earns its place because it is directly playable and points back to the long-running visualization thread.',
    repo: 'https://github.com/khoda81/path-follower', demo: './path-follower/', signal: 'position / steering', unit: 'px / frame'
  }
];

const featured = document.querySelector('#featured-projects');
projects.slice(0, 5).forEach((project, i) => {
  const article = document.createElement('article');
  article.className = 'project-card';
  const bars = Array.from({ length: 18 }, (_, j) => `<i data-bar="${i}:${j}" style="--h:${18 + ((j * 29 + i * 17) % 72)}%"></i>`).join('');
  article.innerHTML = `
    <div class="project-topline"><span>${project.kind}</span><span>${project.unit}</span></div>
    <div class="signal-bars" aria-hidden="true">${bars}</div>
    <h3>${project.name}</h3>
    <p>${project.description}</p>
    <div class="project-meta"><span>${project.signal}</span></div>
    <div class="actions compact">
      ${project.demo ? `<a class="primary" href="${project.demo}" target="_blank" rel="noreferrer">live ↗</a>` : ''}
      ${project.repo ? `<a href="${project.repo}" target="_blank" rel="noreferrer">github ↗</a>` : ''}
    </div>`;
  featured.append(article);
});

const systems = document.querySelector('#systems-list');
projects.slice(5).forEach((project, i) => {
  const article = document.createElement('article');
  article.innerHTML = `
    <div class="system-index">${String(i + 6).padStart(2, '0')}</div>
    <div>
      <div class="project-topline"><span>${project.kind}</span><span>${project.unit}</span></div>
      <h3>${project.name}</h3>
      <p>${project.description}</p>
    </div>
    <div class="system-links">
      ${project.demo ? `<a href="${project.demo}" target="_blank" rel="noreferrer">live ↗</a>` : ''}
      ${project.repo ? `<a href="${project.repo}" target="_blank" rel="noreferrer">github ↗</a>` : ''}
    </div>`;
  systems.append(article);
});

const TEHRAN_TIME_ZONE = 'Asia/Tehran';
const BIRTH = { year: 2002, month: 8, day: 13, hour: 13, minute: 48, second: 21 };
const tehranFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: TEHRAN_TIME_ZONE,
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
  hourCycle: 'h23'
});

function tehranParts(epochMs) {
  return Object.fromEntries(
    tehranFormatter.formatToParts(new Date(epochMs))
      .filter(part => part.type !== 'literal')
      .map(part => [part.type, Number(part.value)])
  );
}

function tehranLocalEpoch(year, month, day, hour, minute, second) {
  const targetAsUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  let guess = targetAsUtc;
  for (let i = 0; i < 4; i += 1) {
    const local = tehranParts(guess);
    const representedAsUtc = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second);
    const correction = targetAsUtc - representedAsUtc;
    guess += correction;
    if (Math.abs(correction) < 1) break;
  }
  return guess;
}

function fractionalAge(epochMs) {
  const localNow = tehranParts(epochMs);
  let anniversaryYear = localNow.year;
  let previousBirthday = tehranLocalEpoch(anniversaryYear, BIRTH.month, BIRTH.day, BIRTH.hour, BIRTH.minute, BIRTH.second);
  if (epochMs < previousBirthday) {
    anniversaryYear -= 1;
    previousBirthday = tehranLocalEpoch(anniversaryYear, BIRTH.month, BIRTH.day, BIRTH.hour, BIRTH.minute, BIRTH.second);
  }
  const nextBirthday = tehranLocalEpoch(anniversaryYear + 1, BIRTH.month, BIRTH.day, BIRTH.hour, BIRTH.minute, BIRTH.second);
  return anniversaryYear - BIRTH.year + (epochMs - previousBirthday) / (nextBirthday - previousBirthday);
}

const nodes = Object.fromEntries(['age','fps','frame','uptime','pointer','scroll'].map(id => [id, document.querySelector(`#${id}`)]));
const startedAt = performance.now();
let pointerX = 0, pointerY = 0, pointerSpeed = 0, lastPointerT = performance.now();
let lastScrollY = window.scrollY, scrollVelocity = 0, lastScrollT = performance.now();
let frame = 0, lastFrame = performance.now(), smoothFps = 60;
const signalBars = [...document.querySelectorAll('.signal-bars i')];

window.addEventListener('pointermove', event => {
  const now = performance.now();
  const dt = Math.max(1, now - lastPointerT);
  const instant = Math.hypot(event.clientX - pointerX, event.clientY - pointerY) * 1000 / dt;
  pointerSpeed = pointerSpeed * .78 + instant * .22;
  pointerX = event.clientX; pointerY = event.clientY; lastPointerT = now;
}, { passive: true });

window.addEventListener('scroll', () => {
  const now = performance.now();
  const dt = Math.max(1, now - lastScrollT);
  const instant = (window.scrollY - lastScrollY) * 1000 / dt;
  scrollVelocity = scrollVelocity * .72 + instant * .28;
  lastScrollY = window.scrollY; lastScrollT = now;
}, { passive: true });

function tick(now) {
  frame += 1;
  const dt = Math.max(.1, now - lastFrame);
  smoothFps = smoothFps * .92 + (1000 / dt) * .08;
  lastFrame = now;
  const elapsed = (now - startedAt) / 1000;

  nodes.age.textContent = `${fractionalAge(Date.now()).toFixed(12)} y`;
  nodes.fps.textContent = smoothFps.toFixed(1);
  nodes.frame.textContent = frame.toLocaleString('en-US');
  nodes.uptime.textContent = `${elapsed.toFixed(6)} s`;
  nodes.pointer.textContent = `${Math.round(pointerX)},${Math.round(pointerY)} · ${pointerSpeed.toFixed(0)} px/s`;
  nodes.scroll.textContent = `${window.scrollY.toFixed(0)} · ${scrollVelocity.toFixed(0)} px/s`;

  signalBars.forEach((bar, i) => {
    const base = 20 + ((i * 29) % 54);
    const motion = 14 * Math.sin(elapsed * (0.7 + (i % 5) * 0.08) + i * 0.73);
    bar.style.height = `${Math.max(8, Math.min(94, base + motion))}%`;
  });

  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
