import { basename } from 'node:path';
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';

const outdir = 'dist';
rmSync(outdir, { recursive: true, force: true });

const result = await Bun.build({
  entrypoints: ['./index.html'],
  outdir,
  target: 'browser',
  minify: true,
  sourcemap: 'linked'
});

if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}

writeFileSync(`${outdir}/.nojekyll`, '');

// QBar is the current demo supplied with the quantile-rasterizer project.
// Keep qbar-demo/ for the embedded hero and mirror it to /qbar/ for the public demo URL.
if (existsSync('qbar-demo')) {
  for (const destination of [`${outdir}/qbar-demo`, `${outdir}/qbar`]) {
    mkdirSync(destination, { recursive: true });
    cpSync('qbar-demo', destination, { recursive: true });
  }
}

// Keep the older standalone Path Follower demo at its stable URL.
if (existsSync('path-follower')) {
  const destination = `${outdir}/path-follower`;
  mkdirSync(destination, { recursive: true });
  cpSync('path-follower', destination, {
    recursive: true,
    filter: source => basename(source) !== '.git'
  });
}

console.log(`Built portfolio → ${outdir}/`);
