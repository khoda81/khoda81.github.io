# khoda81.github.io

Mahdi Khodabandeh's portfolio, rebuilt as a dependency-free static site.

The visual language is based on information theory rather than generic portfolio decoration: probability density, surprisal in nats/bits, arithmetic-coding intervals, code length, and live page telemetry.

## Development

No framework or package install is required:

```bash
python3 -m http.server 5173
```

Then open <http://localhost:5173>.

## Deployment

Merging to `main` runs `.github/workflows/deploy.yml`, which publishes the static site to the existing `gh-pages` branch. The `qbar` and `path-follower` submodules are copied into the deployment so their existing URLs stay stable.

## Important links

- Portfolio: https://khoda81.github.io/
- Chronickle: https://khoda81.github.io/chronickle/
- QBar: https://khoda81.github.io/qbar/
- Path Follower: https://khoda81.github.io/path-follower/
- GitHub: https://github.com/khoda81
