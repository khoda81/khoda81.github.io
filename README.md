# khoda81.github.io

Mahdi Khodabandeh's portfolio, rebuilt as a small Bun-powered static site.

The visual language is based on information theory rather than generic portfolio decoration: probability density, surprisal in nats/bits, arithmetic-coding intervals, code length, and live page telemetry.

## Development

Bun is the only tool you need. There are no package dependencies to install.

```bash
git submodule update --init --recursive
bun run dev
```

Bun serves the HTML entrypoint directly with its frontend dev server and HMR. Open the localhost URL printed by Bun (normally `http://localhost:3000`).

## Production build

```bash
bun run build
bun run preview
```

The production site is written to `dist/`. The build also carries the QBar and Path Follower submodules into `dist/qbar/` and `dist/path-follower/` so their existing URLs remain stable.

## Deployment

Merging to `main` runs `.github/workflows/deploy.yml`. GitHub Actions installs Bun, runs the same `bun run build`, and publishes `dist/` to the existing `gh-pages` branch.

## Live telemetry

The age counter is anchored to 22 Mordad 1381 / 13 August 2002 at 13:48:21 in `Asia/Tehran`. It is calculated as a calendrical fractional age between successive Tehran-time birthdays, so it reaches the next integer exactly at the birthday instant rather than approximating a year as a fixed number of seconds.

## Important links

- Portfolio: https://khoda81.github.io/
- Chronickle: https://khoda81.github.io/chronickle/
- QBar: https://khoda81.github.io/qbar/
- Path Follower: https://khoda81.github.io/path-follower/
- GitHub: https://github.com/khoda81
