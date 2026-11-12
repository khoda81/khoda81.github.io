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

The page is an arithmetic code. Every project owns a slice of [0, 1): a theme's projects split its slice by weight, so a box's height is its probability and reaching it costs −log₂ of that in bits, where its box begins, as in [natlas](https://github.com/khoda81/natlas). Projects are leaves, so their boxes run on to the right. The root is this page, and its top sixteenth, `1111`, is this page again; so the root is also the top sixteenth of a page just like it, and the pages nest without end both ways. They all look alike, so the camera is always renumbered to stand in level 0: wherever you zoom is the root. Only the top, which every level shares, is an edge.

URLs name a place by path, as `/markets/` or `/markets/lobservatory/`, and every place is prerendered at its path. The hash is the codeword of the view: the biggest dyadic interval on screen, read inside the place as if it were all of [0, 1), so `/markets/#1011` is the sixteenth `1011` of Markets. At `/`, a leading `1111` is the page inside. The header shows the same codeword and can be edited.

- `src/lib/catalog.ts` is the content: themes and projects, with the weights that size them and their commit counts.
- `src/lib/code.ts` builds the interval tree under both measures (attention and commits), names places by path, and converts intervals to codewords and back.
- `src/lib/explorer/address.ts` relates the camera to a place and the bits of its view, and both to URLs.
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
