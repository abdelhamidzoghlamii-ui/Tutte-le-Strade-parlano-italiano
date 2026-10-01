// Phase 2A: per-category layout columns (icona_posizione, icona_dimensione, testo_margine_alto/basso),
// the preview (index.html?anteprima) and the [altra_carta] live region.
import {
  newPage, startGroup, openCategory, shot, soft, assert, eq
} from '../lib.mjs';

const GAME_VIEWPORTS = [[390, 844], [320, 568], [844, 390]];
const PREVIEW_VIEWPORTS = [[390, 844], [1280, 800]];
const FX = 'layout2a';
const MEDIO = 1, FACILE = 0;   // level indexes (livelli.csv order)

// Expected layout per category of the layout2a fixture (tile order = sfide.csv order).
// pos null = no app icon; dim in px of the 750x1050 template; top/bottom in % of the card height.
const CATS = [
  { pos: 'alto-sinistra', dim: 100, top: 25, bottom: 22 },
  { pos: 'alto-centro', dim: 130, top: 32, bottom: 22 },
  { pos: 'alto-destra', dim: 160, top: 25, bottom: 22 },
  { pos: 'basso-sinistra', dim: 160, top: 20, bottom: 30 },
  { pos: 'basso-centro', dim: 150, top: 20, bottom: 30 },
  { pos: 'basso-destra', dim: 160, top: 20, bottom: 30 },
  { pos: 'basso-sinistra', dim: 100, top: 20, bottom: 22, tpl: true },   // template WITH icona_posizione: app icon
  { pos: null, dim: 100, top: 20, bottom: 22, tpl: true },              // template without: none (D2)
  { pos: 'basso-destra', dim: 100, top: 30, bottom: 30 },
  { pos: 'basso-destra', dim: 80, top: 25, bottom: 20.5 },              // "25%" / "20,5" (icon 80: a 100 icon would reach into the 20.5% band)
  { pos: 'basso-destra', dim: 100, top: 20, bottom: 22 },               // invalid values -> defaults
  { pos: 'basso-destra', dim: 100, top: 20, bottom: 22 }                // alto + basso > 80 -> both defaults
];

/* ---- measured inside the page ---- */
function measure(exp) {
  const out = { problems: [] };
  const face = document.querySelector('.card-front');
  if (!face) return { problems: ['no front face'] };
  const F = face.getBoundingClientRect(), H = F.height, W = F.width;
  const cs = getComputedStyle(face);
  const bt = parseFloat(cs.borderTopWidth), bb = parseFloat(cs.borderBottomWidth);
  const icon = face.querySelector('.card-icon');
  const body = face.querySelector('.card-body');
  const R = e => e.getBoundingClientRect();
  const inter = (a, b) => a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5;

  // text area band = margins (the face has a 1px border outside the padding)
  const r = R(body);
  const top = F.top + bt + exp.top / 100 * H, bottom = F.bottom - bb - exp.bottom / 100 * H;
  if (Math.abs(r.top - top) > 1) out.problems.push('text area top ' + (r.top - F.top).toFixed(1) + ' expected ' + (top - F.top).toFixed(1));
  if (Math.abs(r.bottom - bottom) > 1) out.problems.push('text area bottom ' + (F.bottom - r.bottom).toFixed(1) + ' from the bottom, expected ' + (F.bottom - bottom).toFixed(1));

  out.hilfe = face.querySelectorAll('.card-opt').length;
  if (exp.pos === null) {
    if (icon) out.problems.push('template without icona_posizione draws an app icon');
    // the template's own icon (bottom right, 78-88% of the height, 74-90% of the width) stays clear of the pills
    const band = { left: F.left + 0.74 * W, right: F.left + 0.90 * W, top: F.top + 0.78 * H, bottom: F.top + 0.88 * H };
    face.querySelectorAll('.card-btn').forEach(b => { if (inter(R(b), band)) out.problems.push('pill intersects the template icon band'); });
    return out;
  }
  if (!icon) { out.problems.push('app icon missing'); return out; }
  const i = R(icon);
  const [v, h] = exp.pos.split('-');
  const x0 = { sinistra: 0, centro: W / 3, destra: 2 * W / 3 }[h], y0 = v === 'alto' ? 0 : H / 2;
  if (i.left < F.left + x0 - 1 || i.right > F.left + x0 + W / 3 + 1 || i.top < F.top + y0 - 1 || i.bottom > F.top + y0 + H / 2 + 1) {
    out.problems.push('icon ' + exp.pos + ' not inside its sixth: x ' + Math.round(i.left - F.left) + '..' + Math.round(i.right - F.left) + ', y ' + Math.round(i.top - F.top) + '..' + Math.round(i.bottom - F.top) + ' of ' + Math.round(W) + 'x' + Math.round(H));
  }
  const want = exp.dim * H / 1050;
  if (Math.abs(i.width - want) > 2 || Math.abs(i.height - want) > 2) out.problems.push('icon size ' + i.width.toFixed(1) + ' expected ' + want.toFixed(1));
  // CSS cards with an alto-* icon: the title (box and text) never touches the icon
  if (exp.pos.startsWith('alto') && !exp.tpl) {
    const title = face.querySelector('.card-title');
    if (!title) out.problems.push('title missing');
    else [title, title.querySelector('.card-title-text')].forEach(e => {
      if (e && inter(R(e), i)) out.problems.push('title ' + e.className + ' intersects the ' + exp.pos + ' icon');
    });
  }
  // pills (whatever is on the front face now: Hilfe closed = both, open = [soluzione]) never touch the icon
  face.querySelectorAll('.card-btn').forEach(b => {
    if (inter(R(b), i)) out.problems.push('pill ' + b.className.split(' ')[1] + ' intersects the icon');
    const pr = R(b);
    if (pr.left < F.left || pr.right > F.right) out.problems.push('pill outside the card');
  });
  return out;
}

export default async function (t) {
  /* ---------- game: icon position / size / margins / pills ---------- */
  for (const [w, h] of GAME_VIEWPORTS) {
    t.test(`layout2a ${w}x${h}: icon sixth + size, margins, pills clear of the icon (Hilfe closed / open)`, async ({ browser }) => {
      const s = soft();
      const page = await newPage(browser, { w, h, lang: 'it', fixture: FX, touch: w < 800 });
      await startGroup(page, MEDIO);
      eq(await page.locator('.tile').count(), CATS.length, 'tiles');
      for (let i = 0; i < CATS.length; i++) {
        const label = `cat ${i} (${CATS[i].pos || 'template, no position'})`;
        await openCategory(page, i);
        const closed = await page.evaluate(measure, CATS[i]);
        closed.problems.forEach(p => s.fail(label + ' Hilfe closed: ' + p));
        // Hilfe open: [aiuto] disappears, the options appear
        await page.click('.btn-aiuto');
        await page.waitForTimeout(80);
        const open = await page.evaluate(measure, CATS[i]);
        s.check(open.hilfe === 3, label + ': Hilfe options missing');
        open.problems.forEach(p => s.fail(label + ' Hilfe open: ' + p));
        if (i === 3 || i === 5) await shot(page, `layout2a-${w}x${h}-${i}`);
        await page.locator('.pair.bottom .btn-secondary').click();
        await page.waitForSelector('.tiles');
      }
      s.done();
    });
  }

  t.test('layout2a banner: the 4 invalid values give 4 messages, defaults are used', async ({ browser }) => {
    for (const lang of ['it', 'de']) {
      const page = await newPage(browser, { lang, fixture: FX });
      const p = await page.evaluate(() => window.__app.problems.map(x => x.file + ':' + x.riga + ':' + x.key));
      eq(JSON.stringify(p), JSON.stringify([
        'sfide.csv:12:err_posizione', 'sfide.csv:12:err_icona_dimensione', 'sfide.csv:12:err_margine', 'sfide.csv:13:err_margine'
      ]), 'problems');
      const lines = await page.locator('#banner li').allTextContents();
      eq(lines.length, 4, 'banner lines');
      if (lang === 'it') {
        assert(lines[0].includes("posizione dell'icona 'sopra' non valida: usa alto-/basso- + sinistra/centro/destra"), lines[0]);
        assert(lines[1].includes('da 20 a 400'), lines[1]);
        assert(lines[2].includes('da 0 a 45') && lines[3].includes('al massimo 80'), lines[2] + ' | ' + lines[3]);
      } else {
        assert(lines[0].includes("Icon-Position 'sopra' ungültig"), lines[0]);
        assert(lines[1].includes('von 20 bis 400'), lines[1]);
      }
      // the invalid cells fall back to the defaults (null = default), valid neighbours are kept
      const L = await page.evaluate(() => window.__app.sfide.slice(10).map(s => [s.iconPos, s.iconSize, s.textTop, s.textBottom]));
      eq(JSON.stringify(L), JSON.stringify([[null, null, null, null], [null, null, null, null]]), 'defaults');
      // tolerant numbers: "160px", "25%", "20,5", " basso-centro ", "alto destra", "ALTO-CENTRO"
      const P = await page.evaluate(() => window.__app.sfide.map(s => [s.iconPos, s.iconSize, s.textTop, s.textBottom]));
      eq(JSON.stringify(P[3]), JSON.stringify(['basso-sinistra', 160, null, 30]), 'basso-sinistra row');
      eq(JSON.stringify(P[4]), JSON.stringify(['basso-centro', 150, null, 30]), 'basso-centro row');
      eq(JSON.stringify(P[2]), JSON.stringify(['alto-destra', 160, 25, null]), 'alto destra row');
      eq(JSON.stringify(P[1]), JSON.stringify(['alto-centro', 130, 32, null]), 'ALTO-CENTRO row');
      eq(JSON.stringify(P[9]), JSON.stringify([null, 80, 25, 20.5]), '25% / 20,5 row');
    }
  });

  t.test('layout2a err_icona_testo: icon reaching into the text area (or leaving no room for the title) is reported, with the right margin', async ({ browser }) => {
    for (const lang of ['it', 'de']) {
      const page = await newPage(browser, { lang, fixture: 'iconawarn' });
      const p = await page.evaluate(() => window.__app.problems.filter(x => x.key === 'err_icona_testo').map(x => x.riga + ':' + x.vars.margine));
      // rows: A basso (2), B alto (3), C template with position (4), E alto-centro title room (6); D/F/G/H/I/J are fine
      eq(JSON.stringify(p), JSON.stringify(['2:testo_margine_basso', '3:testo_margine_alto', '4:testo_margine_basso', '6:testo_margine_alto']));
      eq(await page.evaluate(() => window.__app.problems.length), 4, 'no other problems');
      const lines = await page.locator('#banner li').allTextContents();
      assert(lines[0].includes(lang === 'it' ? "l'icona entra nell'area del testo" : 'Icon ragt in den Textbereich') && lines[0].includes('testo_margine_basso'), lines[0]);
      assert(lines[1].includes('testo_margine_alto'), lines[1]);
    }
    // sample data and the layout2a fixture's well-formed rows: no such warning
    const repo = await newPage(browser, { lang: 'it' });
    eq(await repo.evaluate(() => window.__app.problems.filter(x => x.key === 'err_icona_testo').length), 0, 'sample data');
    const fx = await newPage(browser, { lang: 'it', fixture: FX });
    eq(await fx.evaluate(() => window.__app.problems.filter(x => x.key === 'err_icona_testo').length), 0, 'layout2a fixture');
  });

  t.test('layout2a banner is static (in flow), not sticky: it does not cover the scrolled preview', async ({ browser }) => {
    const page = await newPage(browser, { w: 390, h: 844, lang: 'it', fixture: FX, goto: false });
    await page.goto(page.fixtureBase + '?anteprima');
    await page.waitForSelector('.pv-grid .card-flip');
    eq(await page.evaluate(() => getComputedStyle(document.getElementById('banner')).position), 'static');
    await page.evaluate(() => window.scrollTo(0, 1500));
    const top = await page.evaluate(() => document.getElementById('banner').getBoundingClientRect().bottom);
    assert(top <= 0, 'banner still in view after scrolling: bottom ' + top);
  });

  t.test('layout2a an older sfide.csv without the 4 columns: ONE warning, defaults', async ({ browser }) => {
    const page = await newPage(browser, { lang: 'it', fixture: 'oldsfide' });
    const p = await page.evaluate(() => window.__app.problems.map(x => ({ file: x.file, key: x.key, valore: x.vars.valore })));
    eq(p.length, 1, JSON.stringify(p));
    eq(p[0].key, 'err_colonna_opzionale');
    eq(p[0].file, 'sfide.csv');
    eq(p[0].valore, 'icona_posizione, icona_dimensione, testo_margine_alto, testo_margine_basso');
    await startGroup(page, FACILE);
    eq(await page.locator('.tile').count(), 8);
  });

  t.test('layout2a repo data (columns blank): batch 2 geometry, text area 20%/22%, no app icon on template cards', async ({ browser }) => {
    const s = soft();
    for (const [w, h] of GAME_VIEWPORTS) {
      const page = await newPage(browser, { w, h, lang: 'it', touch: w < 800 });
      await startGroup(page, FACILE);
      for (const tile of [0, 1]) {   // PARLA DI TE, CREA IL PLURALE: template cards with Facile cards
        await openCategory(page, tile);
        const r = await page.evaluate(measure, { pos: null, top: 20, bottom: 22 });
        r.problems.forEach(p => s.fail(`${w}x${h} tile ${tile}: ${p}`));
        const v = await page.evaluate(() => {
          const c = getComputedStyle(document.querySelector('.card-front'));
          return [c.getPropertyValue('--text-top'), c.getPropertyValue('--text-bottom'), c.getPropertyValue('--icon-size')].map(x => parseFloat(x));
        });
        eq(JSON.stringify(v), JSON.stringify([0.2, 0.22, 100]), 'custom properties');
        await page.locator('.pair.bottom .btn-secondary').click();
        await page.waitForSelector('.tiles');
      }
    }
    s.done();
  });

  /* ---------- screen reader: [altra_carta] live region ---------- */
  t.test('layout2a [altra_carta] announces the new prompt through a polite live region, focus stays', async ({ browser }) => {
    const page = await newPage(browser, { lang: 'it' });
    await startGroup(page, FACILE);
    await openCategory(page, 1);   // CREA IL PLURALE: 2 Facile cards
    const live = page.locator('#card-live');
    eq(await live.getAttribute('aria-live'), 'polite');
    eq(await live.getAttribute('role'), 'status');
    assert(await page.evaluate(() => !document.getElementById('app').contains(document.getElementById('card-live'))), 'live region must live outside #app');
    await page.waitForTimeout(450);   // double-tap guard
    await page.focus('[data-fid="altra"]');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(250);
    const want = await page.evaluate(() => window.__app.carte[window.__app.card.idx].testo);
    eq((await live.textContent()).trim(), want, 'announced text');
    eq(await page.evaluate(() => document.activeElement && document.activeElement.dataset.fid), 'altra', 'focus stays on [altra_carta]');
    // and again: the same text is announced again (cleared first)
    await page.waitForTimeout(450);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(250);
    const want2 = await page.evaluate(() => window.__app.carte[window.__app.card.idx].testo);
    eq((await live.textContent()).trim(), want2, 'second announcement');
  });

  /* ---------- preview ---------- */
  for (const [w, h] of PREVIEW_VIEWPORTS) {
    for (const lang of ['de', 'it']) {
      t.test(`layout2a anteprima ${w}x${h} ${lang}: cards, captions, sizes, toggles`, async ({ browser }) => {
        const s = soft();
        const page = await newPage(browser, { w, h, lang, fixture: FX, touch: w < 800, goto: false });
        await page.goto(page.fixtureBase + '?anteprima');
        await page.waitForSelector('.pv-grid .card-flip');
        await page.evaluate(() => document.fonts && document.fonts.ready);
        await page.waitForTimeout(300);
        const tag = `layout2a-anteprima-${w}x${h}-${lang}`;
        const noScroll = async what => {
          const m = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
          s.check(m[0] <= m[1], `${what}: horizontal scroll ${m[0]} > ${m[1]}`);
        };
        const data = await page.evaluate(() => ({
          sfide: window.__app.sfide.map(x => ({ n: x.sfida, iconPos: x.iconPos, icon: x.icona_dimensione, iconSet: x.iconSize != null, top: x.testo_margine_alto, topSet: x.textTop != null, bottom: x.testo_margine_basso, bottomSet: x.textBottom != null })),
          carte: window.__app.carte.map(c => ({ sfida: c.sfida, testo: c.testo, risposta: c.risposta, opz: c.opzioni.length }))
        }));
        const longest = n => data.carte.filter(c => c.sfida === n).reduce((a, c) => (!a || c.testo.length > a.testo.length ? c : a), null);

        // a) one card per category, the longest testo, preview page not game
        eq(await page.locator('.pv-item').count(), data.sfide.length, 'card count');
        eq(await page.evaluate(() => document.body.className), 'screen-anteprima');
        const items = page.locator('.pv-item');
        for (let i = 0; i < data.sfide.length; i++) {
          const sf = data.sfide[i];
          eq((await items.nth(i).locator('.card-front .card-text').textContent()).trim(), longest(sf.n).testo, 'longest testo of ' + sf.n);
          // b) caption: column names + value set or "standard"
          const dts = await items.nth(i).locator('dt').allTextContents();
          ['icona_posizione', 'icona_dimensione', 'testo_margine_alto', 'testo_margine_basso'].forEach(c => s.check(dts.includes(c), `caption of ${sf.n} lacks ${c}`));
          const dd = async c => (await items.nth(i).locator('dt', { hasText: new RegExp('^' + c + '$') }).locator('xpath=following-sibling::dd[1]').textContent()).trim();
          const chk = (c, set, val) => async () => {
            const v = await dd(c);
            if (set) s.check(v === val, `${sf.n} ${c}: "${v}" expected "${val}"`);
            else s.check(v.toLowerCase().includes('standard'), `${sf.n} ${c}: "${v}" is neither a value nor standard`);
          };
          await chk('icona_posizione', !!sf.iconPos, sf.iconPos)();
          await chk('icona_dimensione', sf.iconSet, sf.icon)();
          await chk('testo_margine_alto', sf.topSet, sf.top)();
          await chk('testo_margine_basso', sf.bottomSet, sf.bottom)();
        }
        await noScroll('initial');
        // banner visible (the fixture has invalid values)
        const bn = await page.locator('#banner').boundingBox();
        assert(bn && bn.height > 20 && await page.locator('#banner li').count() === 4, 'banner not visible');
        await shot(page, tag + '-media', true);

        // c) size buttons
        for (const hh of [360, 600, 480]) {
          await page.click(`[data-fid="pv-size-${hh}"]`);
          const hs = await page.evaluate(() => [...document.querySelectorAll('.pv-grid .card-flip')].map(e => Math.round(e.getBoundingClientRect().height * 10) / 10));
          s.check(hs.length === data.sfide.length && hs.every(x => Math.abs(x - hh) <= 0.5), `size ${hh}: heights ${[...new Set(hs)]}`);
          eq(await page.getAttribute(`[data-fid="pv-size-${hh}"]`, 'aria-pressed'), 'true');
          await noScroll('size ' + hh);
          await shot(page, `${tag}-${hh}`, true);
        }

        // d) Hilfe toggle: .card-opts on every card with opzioni
        const withOpz = data.sfide.filter(x => { const c = longest(x.n); return c && c.opz === 3; }).length;
        eq(await page.locator('.card-opts').count(), 0, 'no options before the toggle');
        await page.click('[data-fid="pv-aiuto"]');
        eq(await page.getAttribute('[data-fid="pv-aiuto"]', 'aria-pressed'), 'true');
        eq(await page.locator('.card-front .card-opts').count(), withOpz, 'cards with Hilfe options');
        await noScroll('aiuto');
        await shot(page, `${tag}-aiuto`, true);
        await page.click('[data-fid="pv-aiuto"]');
        eq(await page.locator('.card-opts').count(), 0, 'toggle off');

        // e) area outlines: dashed band == text area, dotted icon box
        await page.click('[data-fid="pv-area"]');
        eq(await page.getAttribute('[data-fid="pv-area"]', 'aria-pressed'), 'true');
        eq(await page.locator('.card-front .pv-area').count(), data.sfide.length, 'area outlines');
        eq(await page.locator('.card-front .pv-icon-box').count(), data.sfide.length, 'icon boxes');
        const diffs = await page.evaluate(() => [...document.querySelectorAll('.card-front')].map(f => {
          const a = f.querySelector('.pv-area').getBoundingClientRect(), b = f.querySelector('.card-body').getBoundingClientRect();
          return Math.max(Math.abs(a.top - b.top), Math.abs(a.bottom - b.bottom), Math.abs(a.left - b.left), Math.abs(a.right - b.right));
        }));
        s.check(diffs.every(d => d <= 1), 'area outline differs from the text area: ' + diffs.map(d => d.toFixed(1)));
        await noScroll('area');
        await shot(page, `${tag}-area`, true);

        // f) back faces instead of the fronts (area still on)
        await page.click('[data-fid="pv-retro"]');
        eq(await page.getAttribute('[data-fid="pv-retro"]', 'aria-pressed'), 'true');
        eq(await page.locator('.card-flip.flipped').count(), data.sfide.length, 'flipped cards');
        const backs = await page.evaluate(() => [...document.querySelectorAll('.card-flip.flipped')].map(f => [f.querySelector('.card-back .card-text').textContent.trim(), f.querySelectorAll('.card-back .pv-area').length]));
        s.check(backs.every(b => b[1] === 1), 'back faces without area outline');
        data.sfide.forEach((sf, i) => s.check(backs[i][0] === longest(sf.n).risposta, `back of ${sf.n}: "${backs[i][0]}"`));
        await noScroll('retro');
        await shot(page, `${tag}-retro`, true);

        // g) isolation: game state untouched, only 'lang' in localStorage; language switch works inside the preview
        await page.click(`[data-fid="lang-${lang === 'de' ? 'it' : 'de'}"]`);
        await page.waitForSelector('.pv-grid .card-flip');
        eq(await page.evaluate(() => window.__app.screen + '/' + window.__app.card), 'anteprima/null', 'game state');
        const keys = await page.evaluate(() => Object.keys(localStorage));
        s.check(keys.every(k => k === 'lang'), 'localStorage keys: ' + keys);
        s.done();
      });
    }
  }

  t.test('layout2a anteprima: category without cards shows the no-card face; link back leads to the game', async ({ browser }) => {
    const page = await newPage(browser, { lang: 'it', fixture: 'nocarte', goto: false });
    await page.goto(page.fixtureBase + '?anteprima=1');
    await page.waitForSelector('.pv-grid .card-flip');
    const n = await page.evaluate(() => window.__app.sfide.length);
    eq(await page.locator('.pv-item').count(), n);
    const txt = await page.evaluate(() => [...document.querySelectorAll('.pv-item .card-front .card-text')].map(e => e.textContent.trim()));
    assert(txt.length === n && txt.every(x => x.length > 0 && x === txt[0]), 'no-card message: ' + JSON.stringify(txt));
    eq(await page.locator('.pv-item .card-actions').count(), 0, 'no pills on the no-card face');
    await page.waitForFunction(() => document.querySelector('.pv-back'));
    await page.click('.pv-back');
    await page.waitForSelector('#app .start');
    assert(!(await page.url()).includes('anteprima'), 'link back keeps ?anteprima');
  }, { allowErrors: true });   // nocarte: carte.csv is a 404 on purpose
}
