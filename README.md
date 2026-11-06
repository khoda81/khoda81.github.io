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

## Layout

- `src/routes/+page.svelte` composes the page from the sections in `src/lib/components/`.
- `src/lib/projects.ts` is the project list behind the cards and the systems list.
- `src/lib/live.svelte.ts` samples the page once per frame (clock, frame rate, pointer, scroll) into one snapshot that every animated element reads.
- `static/` is copied to the site root verbatim.

### The recursive mirror

The hero embeds the page in itself through `?mirror=N`, which `src/app.html` turns into `<html data-mirror-depth>` before first paint. A mirror doesn't sample anything: each frame it shows its parent's snapshot and follows its parent's scroll position, so every level shows the same state. Nesting stops at depth 6 (4 on narrow screens).

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
