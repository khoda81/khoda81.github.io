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

for (const demo of ['qbar', 'path-follower']) {
  if (!existsSync(demo)) continue;
  const destination = `${outdir}/${demo}`;
  mkdirSync(destination, { recursive: true });
  cpSync(demo, destination, {
    recursive: true,
    filter: source => basename(source) !== '.git'
  });
}

console.log(`Built portfolio → ${outdir}/`);
