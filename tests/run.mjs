// Usage: node tests/run.mjs [filter] [--shots]   (dev only; needs Playwright + Chromium)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { start } from './server.mjs';
import { loadPlaywright, config, tracked, OUT } from './lib.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
config.shots = args.includes('--shots');
const filter = args.find(a => !a.startsWith('--')) || '';

const tests = [];
const t = { shots: config.shots, test: (name, fn, opts) => tests.push({ name, fn, ...opts }) };   // opts.allowErrors: expected 404s etc.
for (const f of fs.readdirSync(path.join(here, 'specs')).filter(f => f.endsWith('.mjs')).sort()) {
  const mod = await import(pathToFileURL(path.join(here, 'specs', f)).href);
  await mod.default(t);
}

const server = await start(0);
config.base = server.url;
const pw = await loadPlaywright();
const chromium = pw.chromium || pw.default.chromium;
const browser = await chromium.launch();
fs.mkdirSync(OUT, { recursive: true });

let pass = 0, fail = 0;
const selected = tests.filter(x => x.name.includes(filter));
for (const test of selected) {
  let err = null;
  try {
    await test.fn({ browser, url: server.url });
    // console / page errors collected on any page of this test fail it too
    for (const ctx of tracked) for (const p of ctx.pages()) {
      if (p.errors && p.errors.length && !test.allowErrors) throw new Error('browser errors: ' + p.errors.join(' | '));
    }
  } catch (e) { err = e; }
  if (err) {
    fail++;
    console.log('FAIL ' + test.name + '\n     ' + String(err.message || err).split('\n').join('\n     '));
    const safe = test.name.replace(/[^\w.-]+/g, '_').slice(0, 80);
    const pages = tracked.flatMap(c => c.pages());
    if (pages.length) await pages[pages.length - 1].screenshot({ path: path.join(OUT, 'fail-' + safe + '.png') }).catch(() => {});
  } else {
    pass++;
    console.log('PASS ' + test.name);
  }
  for (const ctx of tracked.splice(0)) await ctx.close().catch(() => {});
}
await browser.close();
await server.close();
console.log('\n' + pass + ' passed, ' + fail + ' failed (' + selected.length + ' run)');
process.exit(fail ? 1 : 0);
