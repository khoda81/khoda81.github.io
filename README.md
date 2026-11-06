# khoda81.github.io

Mahdi Khodabandeh's portfolio: a prerendered SvelteKit site, built and run with Bun.

The visual language is based on information theory rather than generic portfolio decoration: probability density, surprisal in nats/bits, arithmetic-coding intervals, code length, and live page telemetry.

## Development

```bash
git submodule update --init --recursive
bun install
bun run dev
```

`bun run check` type-checks the project and `bun test` runs the tests.

In the browser: scroll to zoom (read more bits), drag to pan, click a box to decode it, and use the arrow keys to walk the tree.

## Layout

The page is an arithmetic code. Every project owns a slice of [0, 1): a theme's projects split its slice by weight, so a box's height is its probability and reaching it costs −log₂ of that in bits, which is its width, as in [natlas](https://github.com/khoda81/natlas). Each place ends with an end-of-message slice, so its codeword (the shortest binary fraction inside that slice) is unique and is the URL hash. The top sixteenth, `1111`, is the page itself and contains the whole tree again.

- `src/lib/catalog.ts` is the content: themes and projects, with the weights that size them and their commit counts.
- `src/lib/code.ts` builds the interval tree under both measures (attention and commits) and encodes and decodes codewords.
- `src/lib/explorer/` draws it: `view.ts` is the camera (depth and zoom are one coordinate), `layout.ts` turns the tree into screen boxes, `slabs.ts` draws them with three.js, and `Scene.svelte` handles motion, input, labels and the qbar axes.
- `src/lib/components/Panel.svelte` is the readable side of the same state, including an index of every project.
- `static/` is copied to the site root verbatim.

## Production build

```bash
bun run build
bun run preview
```

The site is written to `build/`. The build also copies the Path Follower submodule into `build/path-follower/` so its URL stays stable. `/qbar/` is served by the [qbar](https://github.com/khoda81/qbar) repository's own GitHub Pages site.

## Deployment

Merging to `main` runs `.github/workflows/deploy.yml`. GitHub Actions installs Bun, runs the checks, tests and `bun run build`, and publishes `build/` to the existing `gh-pages` branch.

## Live telemetry

The age counter is anchored to 22 Mordad 1381 / 13 August 2002 at 13:48:21 in `Asia/Tehran`. It is calculated as a calendrical fractional age between successive Tehran-time birthdays, so it reaches the next integer exactly at the birthday instant rather than approximating a year as a fixed number of seconds.

## Important links

- Portfolio: https://khoda81.github.io/
- Chronickle: https://khoda81.github.io/chronickle/
- QBar: https://khoda81.github.io/qbar/
- Path Follower: https://khoda81.github.io/path-follower/
- GitHub: https://github.com/khoda81
