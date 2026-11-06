export type Project = {
  name: string;
  kind: string;
  description: string;
  repo?: string;
  /** A live deployment. */
  demo?: string;
  /** What the card's signal bars stand for. */
  signal: string;
  unit: string;
};

/** Cards under "selected signals"; `systems` continues their numbering. */
export const featured: Project[] = [
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
    demo: '/qbar/', signal: 'quantile / tick family / visibility', unit: 'Q(p)'
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
  }
];

export const systems: Project[] = [
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
    repo: 'https://github.com/khoda81/path-follower', demo: '/path-follower/', signal: 'position / steering', unit: 'px / frame'
  }
];
