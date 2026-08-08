import { extname, normalize } from 'node:path';

const port = Number(Bun.env.PORT ?? 3000);
const types: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp'
};

const server = Bun.serve({
  port,
  async fetch(request) {
    const url = new URL(request.url);
    let pathname = decodeURIComponent(url.pathname);
    if (pathname.endsWith('/')) pathname += 'index.html';

    const relative = normalize(pathname.replace(/^\/+/, ''));
    if (relative.startsWith('..')) return new Response('bad path', { status: 400 });

    const file = Bun.file(relative || 'index.html');
    if (!(await file.exists())) return new Response('not found', { status: 404 });

    return new Response(file, {
      headers: {
        'content-type': types[extname(relative).toLowerCase()] ?? 'application/octet-stream',
        'cache-control': 'no-store'
      }
    });
  }
});

console.log(`Portfolio dev server → http://localhost:${server.port}`);
