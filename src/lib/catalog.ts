export type Link = { label: string; href: string };

export type Preview =
  | { kind: 'image'; src: string; alt: string }
  | { kind: 'live'; src: string; title: string }
  | { kind: 'qbar-fleet' };

export type Project = {
  slug: string;
  name: string;
  kind: string;
  summary: string;
  links: Link[];
  /** How much of a reader's attention it deserves, relative to the other projects in its theme. */
  emphasis: number;
  /** Commits on GitHub as of 2026-11-06; absent for private repositories. */
  commits?: number;
  preview?: Preview;
};

export type Theme = {
  slug: string;
  name: string;
  summary: string;
  /** Relative to the other themes. */
  emphasis: number;
  projects: Project[];
};

const github = (repo: string): Link => ({ label: 'source', href: `https://github.com/khoda81/${repo}` });

export const themes: Theme[] = [
  {
    slug: 'interfaces',
    name: 'Probability you can see',
    summary: 'Interfaces where the distribution itself is what you look at and touch: trees of continuations, axes laid out by quantiles, benchmarks compared as distributions.',
    emphasis: .27,
    projects: [
      {
        slug: 'natlas', name: 'natlas', kind: 'PROBABILITY TREES',
        summary: 'Navigates language-model and music-transcription distributions as nested intervals. A box is as tall as its probability and as wide as its surprisal, so a node’s children cover its entropy, and comparing two models shows their KL divergence as extra area. This page borrows its geometry.',
        links: [github('natlas')], emphasis: .34, commits: 32,
        preview: { kind: 'image', src: '/media/natlas-text.webp', alt: 'natlas drawing SmolLM2-360M’s continuations of “The most interesting consequence of information theory is”' }
      },
      {
        slug: 'qbar', name: 'QBar', kind: 'QUANTILE AXES',
        summary: 'Density-aware ticks for anything laid out by a quantile function: uncertainty bars, ETAs, log and range sliders. Where a distribution is concentrated, fine steps appear; in the tails only coarse ones survive. Framework-free web components, published on npm.',
        links: [
          { label: 'playground', href: '/qbar/playground' },
          { label: 'npm', href: 'https://www.npmjs.com/package/@qbar/qbar' },
          github('qbar')
        ],
        emphasis: .3, commits: 24, preview: { kind: 'qbar-fleet' }
      },
      {
        slug: 'natwalk', name: 'natwalk', kind: 'MODEL NAVIGATION',
        summary: 'Explores autoregressive models by lazy Dijkstra search in surprisal distance, over complete next-symbol distributions with no top-k or top-p truncation. The engine behind natlas.',
        links: [github('natwalk')], emphasis: .18, commits: 78,
        preview: { kind: 'image', src: '/media/natwalk.webp', alt: 'natwalk navigating Qwen3-4B’s predictions in a terminal' }
      },
      {
        slug: 'critdash', name: 'cargo-critdash', kind: 'BENCHMARK STATISTICS',
        summary: 'Runs Criterion benchmarks and compares runs live as distributions, with probability of superiority and log-improvement, instead of point estimates.',
        links: [{ label: 'crates.io', href: 'https://crates.io/crates/cargo-critdash' }, github('cargo-critdash')],
        emphasis: .18, commits: 22,
        preview: { kind: 'image', src: '/media/critdash.webp', alt: 'cargo-critdash comparing benchmark runs' }
      }
    ]
  },
  {
    slug: 'coding',
    name: 'Compression & coding',
    summary: 'Arithmetic coders, prequential code length, and models judged by how many bits they spend.',
    emphasis: .2,
    projects: [
      {
        slug: 'arithmetipy', name: 'Arithmetipy', kind: 'ARITHMETIC CODING',
        summary: 'Streaming arithmetic coding for Python: a 32-bit encoder and decoder written in Rust and exposed through PyO3.',
        links: [{ label: 'PyPI', href: 'https://pypi.org/project/arithmetipy/' }, github('arithmetipy')],
        emphasis: .3, commits: 12
      },
      {
        slug: 'mercy', name: 'mercy', kind: 'ENTROPY MODELS',
        summary: 'Ranked-prefix arithmetic coding with exact, arbitrary-precision dyadic boundaries: the smallest probability interface a composable coder needs.',
        links: [github('mercy')], emphasis: .22, commits: 4
      },
      {
        slug: 'dethcod', name: 'DETHCOD', kind: 'LEARNED COMPRESSION',
        summary: 'Learned lossless compression experiments with transformer token and vector bottlenecks.',
        links: [github('dethcod')], emphasis: .18, commits: 27
      },
      {
        slug: 'kraft', name: 'KRAFT', kind: 'PROGRAM MIXTURES',
        summary: 'Compute-aware Bayesian mixtures over small programs, scored by total code length on a byte stream, starting from exhaustively enumerable finite-state predictors.',
        links: [github('kraft')], emphasis: .18, commits: 8
      },
      {
        slug: 'tokenizers', name: 'Tokenizer experiment', kind: 'PREQUENTIAL CODING',
        summary: 'Compares tokenizers by block-prequential code length in bits per raw UTF-8 byte: byte-level BPE against a prefix-free Tunstall vocabulary, under the same Transformer.',
        links: [github('tokenizer-experiment')], emphasis: .12, commits: 34
      }
    ]
  },
  {
    slug: 'markets',
    name: 'Markets',
    summary: 'Order books, prediction markets and news, recorded exactly and drawn without collapsing them to a single price.',
    emphasis: .16,
    projects: [
      {
        slug: 'lobservatory', name: 'LObservatory', kind: 'LIVE ORDER BOOKS',
        summary: 'A live Polymarket order-book and liquidity-pressure dashboard with exact spread semantics, per-market resolution clocks and recorded history.',
        links: [github('lobservatory')], emphasis: .34, commits: 1094
      },
      {
        slug: 'chronickle', name: 'Chronickle', kind: 'MARKET + NEWS',
        summary: 'Market movements and real-world news on one shared, scrubbable timeline, with price heatmaps and data-acquisition telemetry.',
        links: [{ label: 'live', href: '/chronickle/' }, github('chronickle')],
        emphasis: .3, commits: 106,
        preview: { kind: 'live', src: '/chronickle/', title: 'Chronickle, live' }
      },
      {
        slug: 'orderbook-ball', name: 'Order-book Ball', kind: 'MARKET MICROSTRUCTURE',
        summary: 'A causal price estimator that moves only when the executable bid/ask interval reaches it, with a temporal-spread hitting-time field.',
        links: [github('orderbook-ball')], emphasis: .2, commits: 12
      },
      {
        slug: 'book-recorder', name: 'Book recorder', kind: 'RUST RECORDER',
        summary: 'The recorder behind LObservatory: demand-driven market websockets, causal book bootstrap, and exact pressure history in SQLite.',
        links: [github('polymarket-book-recorder')], emphasis: .16, commits: 147
      }
    ]
  },
  {
    slug: 'search',
    name: 'Search & compute',
    summary: 'Deciding where the next unit of compute goes: tree search, game engines, and models of how people actually play.',
    emphasis: .14,
    projects: [
      {
        slug: 'bayes-2048', name: 'bayes-2048', kind: 'VALUE OF COMPUTATION',
        summary: 'Bayesian value of computation against Thompson sampling and UCT for allocating Monte Carlo tree search compute, benchmarked on 2048.',
        links: [github('bayes-2048')], emphasis: .32, commits: 2
      },
      {
        slug: '2048-solver', name: '2048 Solver', kind: 'RUST + SEARCH',
        summary: 'A portable-SIMD 2048 engine with deadline-bounded search: an agent that continuously turns compute into better moves.',
        links: [github('rust-2048-solver')], emphasis: .24, commits: 72
      },
      {
        slug: 'harmon', name: 'Harmon', kind: 'CHESS + ML',
        summary: 'A chess opponent model trained on human games to predict likely human moves and mistakes.',
        links: [github('harmon')], emphasis: .22, commits: 10
      },
      {
        slug: 'vertical-epoching', name: 'Vertical Epoching', kind: 'ML RESEARCH',
        summary: 'Adaptive optimization depth: keep spending gradient updates on a batch while fresh, unseen evidence says the extra compute still transfers. The repository is private for now.',
        links: [], emphasis: .22
      }
    ]
  },
  {
    slug: 'systems',
    name: 'Systems',
    summary: 'The data structures underneath, which keep everything above responsive.',
    emphasis: .09,
    projects: [
      {
        slug: 'logvec', name: 'LogVec', kind: 'CACHE-AWARE SYSTEMS',
        summary: 'A Bentley–Saxe logarithmic structure in one contiguous Vec: binary-sized sorted runs and zero-allocation merges, benchmarked against BTreeSet.',
        links: [github('logvec')], emphasis: .5, commits: 21
      },
      {
        slug: 'time-series-cache', name: 'time-series-cache', kind: 'RUST DATA STRUCTURE',
        summary: 'An augmented treap for strict predecessor and successor queries, range extrema, and targeted renderer invalidation.',
        links: [github('time-series-cache')], emphasis: .5, commits: 8
      }
    ]
  },
  {
    slug: 'play',
    name: 'Tools & toys',
    summary: 'Colour, graphs, and small things built to be used.',
    emphasis: .08,
    projects: [
      {
        slug: 'chromatour', name: 'Chromatour', kind: 'COLOUR ORDERING',
        summary: 'Sorts colours as an open travelling-salesperson path through OKLab, with the optimizer in Rust compiled to WebAssembly.',
        links: [github('chromatour')], emphasis: .26, commits: 2
      },
      {
        slug: 'loghmeh', name: 'Loghmeh', kind: 'BROWSER EXTENSION',
        summary: 'A calmer planner for University of Tehran dining: a weekly calendar, budget previews, and recovery when the server rejects a save. For Firefox and Chrome.',
        links: [{ label: 'releases', href: 'https://github.com/khoda81/loghmeh/releases' }, github('loghmeh')],
        emphasis: .22, commits: 56,
        preview: { kind: 'image', src: '/media/loghmeh.webp', alt: 'Loghmeh’s weekly planner with fictional menus' }
      },
      {
        slug: 'better-graph-3d', name: 'Better 3D Graph', kind: 'INTERACTIVE GRAPH',
        summary: 'A live 3D force-directed graph of an Obsidian vault, rendered with Three.js.',
        links: [github('obsidian-better-graph-3d')], emphasis: .2, commits: 91
      },
      {
        slug: 'photogenic', name: 'Photogenic', kind: 'GENETIC COLOUR',
        summary: 'A genetic algorithm that orders colours by CIEDE2000 perceptual similarity, in Rust and WebAssembly.',
        links: [{ label: 'live', href: 'https://photogenic-delta.vercel.app' }, github('photogenic')],
        emphasis: .16, commits: 16
      },
      {
        slug: 'path-follower', name: 'Path Follower', kind: 'PATHFINDING',
        summary: 'Waypoint-guided A* with swappable heuristics, playable in the browser.',
        links: [{ label: 'live', href: '/path-follower/' }, github('path-follower')],
        emphasis: .16, commits: 8,
        preview: { kind: 'live', src: '/path-follower/', title: 'Path Follower, live' }
      }
    ]
  }
];
