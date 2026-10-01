// Layout checks: header row, no overflow, tap targets, popups, card fit, contrast, landscape, banner, double tap.
import {
  newPage, load, startGroup, startPlayers, chooseNumber, openCategory, shot, soft, assert, eq, overlaps, config
} from '../lib.mjs';

const VIEWPORTS = [[320, 568], [375, 667], [390, 844], [412, 915], [1280, 800]];
const LANGS = ['de', 'it'];
const LONG = 'Massimiliano Alessandro Bianchi';
const NAMES = [LONG, 'Anna', 'Bruno', 'Chiara', 'Dario', 'Elena'];
const LEVELS = [0, 1, 2, 0, 1, 2];   // player 0 = Facile (CREA IL PLURALE has Hilfe there)
const T_PLURALE = 1, T_TIMER = 5;     // tile indexes in data/sfide.csv

/* ---- measurements run inside the page ---- */
function measure(opts) {
  const vw = window.innerWidth, vh = window.innerHeight;
  const out = { problems: [] };
  const vis = e => {
    const r = e.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return false;
    const cs = getComputedStyle(e);
    if (cs.visibility === 'hidden' || cs.display === 'none') return false;
    if (e.closest('[hidden]')) return false;
    return true;
  };
  const rect = e => { const r = e.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; };
  const name = e => (e.className && typeof e.className === 'string' ? '.' + e.className.split(' ')[0] : e.tagName.toLowerCase()) + ' "' + (e.textContent || e.value || '').trim().slice(0, 24) + '"';

  if (document.documentElement.scrollWidth > vw) out.problems.push('horizontal scroll: scrollWidth ' + document.documentElement.scrollWidth + ' > ' + vw);

  // #lang vs everything in #app outside the topbar and the backdrop
  const lang = document.getElementById('lang');
  if (!lang) out.problems.push('#lang missing');
  else {
    const lr = lang.getBoundingClientRect();
    if (!lang.closest('.topbar')) out.problems.push('#lang is not inside .topbar');
    if (getComputedStyle(lang).position === 'fixed') out.problems.push('#lang is position:fixed');
    document.querySelectorAll('#app *').forEach(e => {
      if (e.closest('.topbar') || e.closest('.backdrop') || !vis(e)) return;
      if (e.closest('.card-flip') && e.closest('.card-flip').classList.contains('flipped') && e.closest('.card-front')) return;
      const r = e.getBoundingClientRect();
      if (r.left < lr.right && lr.left < r.right && r.top < lr.bottom && lr.top < r.bottom) out.problems.push('#lang overlaps ' + name(e));
    });
  }

  // tap targets
  const buttons = [...document.querySelectorAll('button, input, [role=button]')].filter(e => vis(e) && !e.closest('[inert]'));
  buttons.forEach(e => {
    const r = e.getBoundingClientRect();
    if (r.width < 43.5 || r.height < 43.5) out.problems.push('tap target too small ' + Math.round(r.width) + 'x' + Math.round(r.height) + ' ' + name(e));
  });

  // popups: no spilled text inside buttons
  document.querySelectorAll('.panel button').forEach(b => {
    if (b.scrollHeight > b.clientHeight + 1) out.problems.push('popup button text spills (' + b.scrollHeight + ' > ' + b.clientHeight + ') ' + name(b));
  });
  if (opts.popup) {
    const panel = document.querySelector('.panel');
    if (!panel) out.problems.push('expected a popup');
    else {
      const r = panel.getBoundingClientRect();
      if (r.top < -0.5 || r.bottom > vh + 0.5) out.problems.push('popup panel outside the viewport');
    }
  }

  // card screens: viewport-locked, bottom pair fully visible
  if (opts.card) {
    const de = document.documentElement;
    if (de.scrollHeight > vh + 1) out.problems.push('page scrolls vertically: ' + de.scrollHeight + ' > ' + vh);
    const bar = document.querySelector('.pair.bottom');
    if (!bar) out.problems.push('bottom pair missing');
    else {
      const r = bar.getBoundingClientRect();
      if (r.bottom > vh + 0.5 || r.top < 0 || r.left < 0 || r.right > vw + 0.5) out.problems.push('bottom pair outside viewport: ' + Math.round(r.top) + '..' + Math.round(r.bottom) + ' of ' + vh);
    }
    buttons.forEach(b => {
      const r = b.getBoundingClientRect();
      if (r.bottom > vh + 0.5 || r.top < -0.5 || r.right > vw + 0.5 || r.left < -0.5) out.problems.push('button outside viewport ' + name(b));
    });
    // Hilfe options must stay clear of the card buttons
    const cbs = buttons.filter(b => b.classList.contains('card-btn')), opts_ = buttons.filter(b => b.classList.contains('card-opt'));
    cbs.forEach(cb => opts_.forEach(o => {
      const a = cb.getBoundingClientRect(), b = o.getBoundingClientRect();
      if (a.left < b.right && b.left < a.right && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5) out.problems.push('card button overlaps Hilfe option ' + name(cb) + ' / ' + name(o));
    }));
    const flip = document.querySelector('.card-flip');
    out.cardH = flip ? flip.getBoundingClientRect().height : 0;
    out.cardW = flip ? flip.getBoundingClientRect().width : 0;
  }

  // contrast of white-text buttons
  const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const parse = s => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { c: p.slice(0, 3), a: p.length > 3 ? p[3] : 1 }; };
  document.querySelectorAll('button').forEach(b => {
    if (!vis(b) || b.disabled) return;
    const cs = getComputedStyle(b), fg = parse(cs.color), bg = parse(cs.backgroundColor);
    if (!fg || !bg || bg.a < 1 || fg.c.join() !== '255,255,255') return;
    const L1 = lum(fg.c), L2 = lum(bg.c), ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    if (ratio < 4.5) out.problems.push('contrast ' + ratio.toFixed(2) + ' < 4.5 ' + name(b));
  });
  return out;
}

async function check(page, s, label, opts = {}) {
  const r = await page.evaluate(measure, opts);
  r.problems.forEach(p => s.fail(label + ': ' + p));
  return r;
}

/* ---- screen walkers ---- */
const S = {
  start: async () => {},
  stesso: async p => { await p.click('.start .btn'); await p.waitForSelector('.btn-yes'); },
  livello: async p => { await p.click('.start .btn'); await p.click('.btn-yes'); await p.waitForSelector('.btn-level'); },
  quanti: async p => { await p.click('.start .btn'); await p.click('.btn-no'); await p.waitForSelector('.btn-num'); },
  giocatori: async p => { await chooseNumber(p, 6); await p.locator('.name-input').first().fill(LONG); },
  'grid-group': async p => { await startGroup(p, 1); },
  'grid-players': async p => { await startPlayers(p, NAMES, LEVELS); },
  'popup-player': async p => { await startPlayers(p, NAMES, LEVELS); await p.click('.topfield-btn'); await p.waitForSelector('.panel'); },
  'popup-level': async p => { await chooseNumber(p, 6); await p.locator('.level-field').first().click(); await p.waitForSelector('.panel'); },
  'dialog-exit': async p => { await startGroup(p, 1); await p.locator('.pair.bottom .btn').first().click(); await p.waitForSelector('.panel'); }
};
const POPUPS = new Set(['popup-player', 'popup-level', 'dialog-exit']);

// card screens, run in group mode (-g) and player mode with the long name (-p)
const C = {
  front: async p => { await openCategory(p, T_PLURALE); },
  hilfe: async p => { await openCategory(p, T_PLURALE); await p.click('.btn-aiuto'); await p.waitForTimeout(100); },
  back: async p => { await openCategory(p, T_PLURALE); await p.click('.btn-soluzione'); await p.waitForTimeout(700); },
  timer: async p => { await openCategory(p, T_TIMER); }
};
const cardStart = {
  g: p => startGroup(p, 0),
  p: p => startPlayers(p, NAMES, LEVELS)
};

export default async function (t) {
  for (const [w, h] of VIEWPORTS) {
    for (const lang of LANGS) {
      t.test(`layout ${w}x${h} ${lang}`, async ({ browser }) => {
        const s = soft();
        const page = await newPage(browser, { w, h, lang, touch: w < 800 });
        const tag = `${w}x${h}-${lang}`;
        for (const [name, walk] of Object.entries(S)) {
          await load(page);
          await walk(page);
          await check(page, s, name, { popup: POPUPS.has(name) });
          await shot(page, `${tag}-${name}`);
        }
        for (const mode of ['g', 'p']) {
          for (const [name, walk] of Object.entries(C)) {
            await load(page);
            await cardStart[mode](page);
            await walk(page);
            const label = `card-${name}-${mode}`;
            await check(page, s, label, { card: true });
            await shot(page, `${tag}-${label}`);
          }
        }
        s.done();
      });
    }
  }

  t.test('layout banner at 320x568: card bottom pair still inside the viewport', async ({ browser }) => {
    const s = soft();
    const page = await newPage(browser, { w: 320, h: 568, lang: 'de', fixture: 'banner', touch: true });
    await page.waitForSelector('#banner:not([hidden])');
    const nProblems = await page.locator('#banner li').count();
    s.check(nProblems >= 2, 'banner should list the 2 bad rows, got ' + nProblems);
    await check(page, s, 'banner-start', {});
    await startGroup(page, 0);
    await openCategory(page, T_TIMER);
    const r = await check(page, s, 'banner-card-timer', { card: true });
    s.check(r.cardH > 100, 'card too small with banner: ' + Math.round(r.cardH));
    await shot(page, '320x568-de-banner-card');
    await load(page);
    await startGroup(page, 0);
    await openCategory(page, T_PLURALE);
    await check(page, s, 'banner-card-front', { card: true });
    s.done();
  });

  t.test('layout banner at 320x568: the (collapsed) banner leaves the card at least 300px tall', async ({ browser }) => {
    const s = soft();
    const page = await newPage(browser, { w: 320, h: 568, lang: 'de', fixture: 'banner', touch: true });
    await page.waitForSelector('#banner:not([hidden])');
    await startGroup(page, 0);
    await openCategory(page, T_PLURALE);
    const open = await page.evaluate(() => document.querySelector('#banner details').open);
    s.check(!open, 'banner should be collapsed on the card screen');
    const r = await check(page, s, 'banner-card', { card: true });
    s.check(r.cardH >= 300, 'card only ' + Math.round(r.cardH) + 'px tall with the banner (need >= 300)');
    await shot(page, '320x568-de-banner-card-collapsed');
    s.done();
  });

  t.test('layout double tap on [altra_carta] draws exactly one card', async ({ browser }) => {
    const page = await newPage(browser, { w: 390, h: 844, lang: 'it', fixture: 'many', touch: true });
    await startGroup(page, 0);
    await openCategory(page, T_PLURALE);
    await page.waitForTimeout(450);
    const len = () => page.evaluate(() => Object.values(window.__app.pools).map(p => p.length));
    const first = await len();
    eq(first.length, 1, 'one pool');
    assert(first[0] >= 9, 'fixture should give >= 9 cards left, got ' + first[0]);
    await page.locator('.pair.bottom .btn:not(.btn-secondary)').dblclick();
    await page.waitForTimeout(200);
    eq((await len())[0], first[0] - 1, 'dblclick consumed cards');
    await page.waitForTimeout(450);
    await page.locator('.pair.bottom .btn:not(.btn-secondary)').click();
    await page.waitForTimeout(100);
    eq((await len())[0], first[0] - 2, 'a later single tap draws another card');
  });

  for (const [w, h, minCard] of [[844, 390, 250], [667, 375, 230]]) {
    t.test(`layout landscape ${w}x${h}`, async ({ browser }) => {
      const s = soft();
      const page = await newPage(browser, { w, h, lang: 'de', touch: true });
      await startGroup(page, 0);
      const cols = await page.evaluate(() => getComputedStyle(document.querySelector('.tiles')).gridTemplateColumns.split(' ').length);
      s.check(cols === 4, 'grid should have 4 tile columns, has ' + cols);
      await check(page, s, 'grid', {});
      await shot(page, `${w}x${h}-de-grid`);
      for (const [name, walk] of Object.entries(C)) {
        await load(page);
        await startGroup(page, 0);
        await walk(page);
        const r = await check(page, s, 'landscape-' + name, { card: true });
        s.check(r.cardH >= minCard, `card height ${Math.round(r.cardH)} < ${minCard} (${name})`);
        // controls column sits to the right of the card
        const geo = await page.evaluate(() => {
          const f = document.querySelector('.card-flip').getBoundingClientRect();
          const b = document.querySelector('.pair.bottom').getBoundingClientRect();
          return { cardRight: f.right, barLeft: b.left };
        });
        s.check(geo.barLeft >= geo.cardRight - 1, `bottom bar (${Math.round(geo.barLeft)}) overlaps the card (right edge ${Math.round(geo.cardRight)}) (${name})`);
        await shot(page, `${w}x${h}-de-card-${name}`);
      }
      s.done();
    });
  }

  t.test('layout overscroll-behavior-y is none', async ({ browser }) => {
    const page = await newPage(browser, { w: 390, h: 844 });
    eq(await page.evaluate(() => getComputedStyle(document.body).overscrollBehaviorY), 'none');
  });
}
