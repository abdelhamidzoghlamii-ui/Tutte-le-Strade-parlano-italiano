// Shared helpers for tests/specs/*.mjs. Dev only: not used by the site.
import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const OUT = path.join(ROOT, 'tests', 'out');

export async function loadPlaywright() {
  try { return await import('playwright'); } catch (e) { /* not resolvable locally: try the global install */ }
  const g = execSync('npm root -g').toString().trim();
  return await import(path.join(g, 'playwright', 'index.mjs'));
}

// run.mjs sets these
export const config = { base: process.env.TEST_URL || 'http://127.0.0.1:8000', shots: false };
export const tracked = [];   // every context opened by newPage (run.mjs closes them after each test)

const readyTimeout = 10000;

/* ---- page ---- */
export async function newPage(browser, { w = 390, h = 844, lang = 'de', fixture = null, touch = false, goto = true } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch, deviceScaleFactor: 1 });
  tracked.push(ctx);
  const page = await ctx.newPage();
  page.setDefaultTimeout(8000);
  page.errors = [];
  page.on('console', m => { if (m.type() === 'error') page.errors.push('console: ' + m.text()); });
  page.on('pageerror', e => page.errors.push('pageerror: ' + e.message));
  await page.addInitScript(l => { try { localStorage.setItem('lang', l); } catch (e) { /* ignore */ } }, lang);
  page.fixtureBase = config.base + (fixture ? '/fx/' + fixture + '/' : '/');
  if (goto) await load(page);
  return page;
}

export async function load(page) {
  await page.goto(page.fixtureBase);
  await page.waitForSelector('#app .start', { timeout: readyTimeout });
  await page.evaluate(() => document.fonts && document.fonts.ready);
  return page;
}

/* ---- flows (selectors are the app's class names; texts are never matched) ---- */
export const startBtn = page => page.locator('.start .btn');
export const tiles = page => page.locator('.tile');
export const bottomBtns = page => page.locator('.pair.bottom .btn');

export async function startGroup(page, levelIndex = 0) {
  await page.click('.start .btn');
  await page.click('.btn-yes');
  await page.locator('.btn-level').nth(levelIndex).click();
  await page.waitForSelector('.tiles');
}

export async function chooseNumber(page, n) {
  await page.click('.start .btn');
  await page.click('.btn-no');
  await page.locator('.btn-num').nth(n - 1).click();
  await page.waitForSelector('.name-input');
}

export async function startPlayers(page, names, levelIdx) {
  await chooseNumber(page, names.length);
  for (let i = 0; i < names.length; i++) {
    await page.locator('.name-input').nth(i).fill(names[i]);
    await page.locator('.level-field').nth(i).click();
    await page.locator('.panel .btn-level').nth(levelIdx[i] ?? 0).click();
  }
  await page.click('.btn-start');
  await page.waitForSelector('.tiles');
}

export async function openCategory(page, tileIdx) {
  await page.locator('.tile').nth(tileIdx).click();
  await page.waitForSelector('.card-flip');
  await page.waitForTimeout(450);   // grow animation (350ms)
}

export const cardText = page => page.evaluate(() => {
  const s = window.__app;
  const c = s.card && s.card.idx != null ? s.carte[s.card.idx] : null;
  return c ? c.testo : null;
});

// Open the category and keep re-drawing (close + reopen) until the card text starts with textPrefix.
export async function drawUntil(page, tileIdx, textPrefix, max = 40) {
  for (let i = 0; i < max; i++) {
    if (!(await page.locator('.card-flip').count())) await openCategory(page, tileIdx);
    const txt = await cardText(page);
    if (txt && txt.startsWith(textPrefix)) return txt;
    await page.locator('.pair.bottom .btn-secondary').click();   // chiudi
    await page.waitForSelector('.tiles');
  }
  throw new Error('drawUntil: no card starting with "' + textPrefix + '"');
}

/* ---- asserts ---- */
export function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }
export function eq(a, b, msg) { if (a !== b) throw new Error((msg ? msg + ': ' : '') + 'expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a)); }
export function overlaps(a, b) {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}
// Collects soft failures so one test reports every broken screen, then throws once.
export function soft() {
  const fails = [];
  return {
    fail(msg) { fails.push(msg); },
    check(cond, msg) { if (!cond) fails.push(msg); },
    done() { if (fails.length) throw new Error(fails.length + ' problem(s):\n  - ' + fails.join('\n  - ')); }
  };
}

export async function shot(page, name) {
  if (!config.shots) return;
  const dir = path.join(OUT, 'shots');
  fs.mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: path.join(dir, name + '.png') });
}
