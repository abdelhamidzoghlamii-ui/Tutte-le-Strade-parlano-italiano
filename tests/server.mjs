// Tiny static server for tests (no deps). Serves the repo root.
// Fixture overlay: /fx/<name>/<path> -> tests/fixtures/<name>/<path> if it exists, else repo <path>;
// if tests/fixtures/<name>/<path>.missing exists -> 404.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIX = path.join(ROOT, 'tests', 'fixtures');
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.csv': 'text/csv', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg', '.json': 'application/json', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg'
};

const isFile = p => { try { return fs.statSync(p).isFile(); } catch (e) { return false; } };
const inside = (base, p) => p === base || p.startsWith(base + path.sep);

function resolve(urlPath) {
  let rel = decodeURIComponent(urlPath);
  let fixture = null;
  const m = rel.match(/^\/fx\/([^/]+)(\/.*)?$/);
  if (m) { fixture = m[1]; rel = m[2] || '/'; }
  if (rel.endsWith('/')) rel += 'index.html';
  const repoFile = path.join(ROOT, rel);
  if (!inside(ROOT, repoFile)) return null;
  if (fixture) {
    const fdir = path.join(FIX, fixture);
    const fFile = path.join(fdir, rel);
    if (!inside(fdir, fFile)) return null;
    if (isFile(fFile + '.missing')) return null;
    if (isFile(fFile)) return fFile;
  }
  return isFile(repoFile) ? repoFile : null;
}

export function start(port = 0) {
  const server = http.createServer((req, res) => {
    let file = null;
    try { file = resolve(new URL(req.url, 'http://x').pathname); } catch (e) { /* bad url */ }
    if (!file) { res.writeHead(404, { 'Cache-Control': 'no-store' }); return res.end('not found'); }
    const size = fs.statSync(file).size;
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Content-Length': size,
      'Cache-Control': 'no-store'
    });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(ok => server.listen(port, '127.0.0.1', () => {
    ok({ url: 'http://127.0.0.1:' + server.address().port, close: () => new Promise(r => { server.closeAllConnections?.(); server.close(r); }) });
  }));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const s = await start(Number(process.env.PORT) || 8000);
  console.log(s.url);
}
