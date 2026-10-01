// Card geometry + text fit: both variants (sfondo template / CSS frame), special cards, no-card, fallback, preload.
import fs from 'node:fs';
import path from 'node:path';
import {
  ROOT, newPage, load, startGroup, openCategory, shot, soft, assert, eq, config
} from '../lib.mjs';

const VIEWPORTS = [[320, 568], [375, 667], [390, 844], [412, 915], [1280, 800], [844, 390], [667, 375]];
const PORTRAIT = VIEWPORTS.slice(0, 5);
const FIXTURES = ['cards', 'cards-css'];   // cards = template (sfondo) variant, cards-css = every sfondo empty
const T_PARLA = 0, T_PLURALE = 1, T_ERRORE = 4, T_QUIZ = 7;   // tile indexes in data/sfide.csv
const MEDIO = 1;                           // level index of the special cards

// key = card text (prefix) or '#<immagine>' for cards without text
const SPECIAL = [
  { name: 'parla', tile: T_PARLA, key: 'Racconta una giornata che non', hilfe: false },
  { name: 'plurale', tile: T_PLURALE, key: 'la precipitevolissimevolmente', hilfe: false },
  { name: 'quiz-foto', tile: T_QUIZ, key: 'Chi è questa persona?', hilfe: true },
  { name: 'quiz-audio', tile: T_QUIZ, key: 'Ascolta e rispondi', hilfe: true },
  { name: 'errore', tile: T_ERRORE, key: '#carta1.png', hilfe: false }
];

// Open the category and re-draw (close + reopen) until the card matches key.
async function drawSpecial(page, tile, key) {
  for (let i = 0; i < 40; i++) {
    if (!(await page.locator('.card-flip').count())) await openCategory(page, tile);
    const k = await page.evaluate(() => {
      const s = window.__app, c = s.card && s.card.idx != null ? s.carte[s.card.idx] : null;
      return c ? (c.testo || '#' + c.immagine) : null;
    });
    if (k && k.startsWith(key)) return;
    await page.locator('.pair.bottom .btn-secondary').click();   // chiudi
    await page.waitForSelector('.tiles');
  }
  throw new Error('no card "' + key + '" drawn in 40 tries');
}

/* ---- measurements inside the page ---- */
function measureFace(opts) {
  const problems = [];
  const face = document.querySelector(opts.side === 'back' ? '.card-back' : '.card-front');
  if (!face) return { problems: ['face missing: ' + opts.side] };
  const body = face.querySelector('.card-body'), p = face.querySelector('.card-prompt');
  const scroll = !!(body && body.classList.contains('fit-scroll'));
  const F = face.getBoundingClientRect(), H = F.height;
  const cs = getComputedStyle(face);
  const top = parseFloat(cs.getPropertyValue('--text-top')), bottom = parseFloat(cs.getPropertyValue('--text-bottom'));
  const bandTop = F.top + top * H, bandBottom = F.bottom - bottom * H;
  const frameH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--frame-h-f')) * H;
  const css = !face.classList.contains('card-tpl') && !face.classList.contains('card-image');
  const tol = 1;
  // in a scrolling text area only the part inside it is on screen; the rest is reachable by scrolling
  const R = e => {
    const r = e.getBoundingClientRect();
    if (!scroll || !body || e === body || !body.contains(e)) return r;
    const b = body.getBoundingClientRect();
    return { left: Math.max(r.left, b.left), right: Math.min(r.right, b.right), top: Math.max(r.top, b.top), bottom: Math.min(r.bottom, b.bottom), width: 0, height: 0 };
  };
  const vis = e => { const r = R(e); return r.right > r.left && r.bottom > r.top; };
  const inter = (a, b) => a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5;
  if (opts.nocard) {
    if (face.querySelector('.card-actions')) problems.push('no-card face has pills');
  }
  if (p && body) {
    const txt = p.querySelector('.card-text');
    // a) never clipped: fits, or fit-scroll is present and the body really scrolls
    const overflow = body.scrollHeight > body.clientHeight;
    if (overflow && !scroll) problems.push('text area overflows without .fit-scroll (' + body.scrollHeight + ' > ' + body.clientHeight + ')');
    if (scroll && getComputedStyle(body).overflowY !== 'auto') problems.push('.fit-scroll body is not scrollable');
    if (p.scrollWidth > p.clientWidth) problems.push('prompt wider than its line (' + p.scrollWidth + ' > ' + p.clientWidth + ')');
    const range = document.createRange();
    range.selectNodeContents(txt);
    const tr = range.getBoundingClientRect(), pr = p.getBoundingClientRect();
    const ftol = Math.max(tol, 0.15 * parseFloat(getComputedStyle(p).fontSize));   // glyph box is a little taller than the line box
    if (tr.bottom > pr.bottom + ftol || tr.top < pr.top - ftol || tr.right > pr.right + tol || tr.left < pr.left - tol) {
      problems.push('prompt text sticks out of the prompt box');
    }
    // b) no word split across lines while font > min
    const fs = parseFloat(getComputedStyle(p).fontSize);
    if (fs > 14.01) {
      const node = txt.firstChild, s = node.textContent;
      const re = /\S+/g;
      let m;
      while ((m = re.exec(s))) {
        const r = document.createRange();
        r.setStart(node, m.index); r.setEnd(node, m.index + m[0].length);
        const rects = [...r.getClientRects()];
        const tops = new Set(rects.map(x => Math.round(x.top)));
        if (tops.size > 1) problems.push('word "' + m[0] + '" split across lines at ' + fs + 'px');
      }
    }
    // e) prompt keeps a usable height
    if (p.getBoundingClientRect().height < 30) problems.push('prompt only ' + Math.round(p.getBoundingClientRect().height) + 'px tall');
    if (opts.expectBreakOk === false && face.classList.contains('fit-break')) problems.push('unexpected fit-break');
  }

  // c) media / prompt / options inside the text band (a scrolling body is checked as a whole)
  const inBand = (e, what) => {
    const r = R(e);
    if (r.top < bandTop - tol || r.bottom > bandBottom + tol) problems.push(what + ' outside the text band: ' + Math.round(r.top - F.top) + '..' + Math.round(r.bottom - F.top) + ' of band ' + Math.round(bandTop - F.top) + '..' + Math.round(bandBottom - F.top));
  };
  if (body) inBand(body, 'text area');
  if (!scroll) face.querySelectorAll('.card-media, .card-prompt, .card-opt').forEach(e => { if (vis(e)) inBand(e, e.className.split(' ')[0]); });

  // pills: in the bottom zone, never over the text band, never over Hilfe options
  const pills = [...face.querySelectorAll('.card-btn')].filter(vis);
  pills.forEach(b => {
    if (R(b).top < bandBottom - tol) problems.push('pill ' + b.className.split(' ')[1] + ' reaches into the text band');
    face.querySelectorAll('.card-opt').forEach(o => { if (inter(R(b), R(o))) problems.push('pill overlaps Hilfe option'); });
  });

  // template / immagine variants: the baked-in icon band (78-88% of the height, 74-90% of the width) is off limits for pills
  if (!css) {
    const band = { left: F.left + 0.74 * F.width, right: F.left + 0.90 * F.width, top: F.top + 0.78 * H, bottom: F.top + 0.88 * H };
    pills.forEach(b => { if (inter(R(b), band)) problems.push('pill ' + b.className.split(' ')[1] + ' intersects the template icon band'); });
  }
  // sketch: [soluzione] bottom-RIGHT on cards tall enough
  if (opts.rightPill) {
    const sol = face.querySelector('.btn-soluzione');
    if (sol && F.right - sol.getBoundingClientRect().right > 20) problems.push('[soluzione] not at the right edge: ' + Math.round(F.right - sol.getBoundingClientRect().right) + 'px away');
  }
  // Hilfe: all options fully visible, no scrolling
  if (opts.allOpts) {
    if (scroll) problems.push('options need scrolling (.fit-scroll)');
    face.querySelectorAll('.card-opt').forEach(o => {
      const r = o.getBoundingClientRect(), b = body.getBoundingClientRect();
      if (r.top < b.top - 0.5 || r.bottom > b.bottom + 0.5) problems.push('option not fully visible');
    });
    if (face.querySelectorAll('.card-opt').length !== 3) problems.push('expected 3 options');
  }
  // wherever the text area scrolls there is a visible cue
  if (scroll) {
    const atEnd = body.scrollTop + body.clientHeight >= body.scrollHeight - 1;
    if (getComputedStyle(body, '::after').content === 'none') problems.push('.fit-scroll without cue element');
    else if (!atEnd && (!body.classList.contains('more-below') || getComputedStyle(body, '::after').opacity !== '1')) problems.push('.fit-scroll: cue not shown although content is below');
  }

  // d) CSS variant: icon clear of everything, title in the top band
  if (css) {
    const icon = face.querySelector('.card-icon'), title = face.querySelector('.card-title');
    if (!icon || !vis(icon)) problems.push('CSS variant: icon missing');
    else {
      const ir = R(icon);
      if (ir.top < bandBottom - 0.5) problems.push('icon reaches into the text band');
      if (ir.right > F.right || ir.bottom > F.bottom || ir.left < F.left) problems.push('icon outside the card');
      face.querySelectorAll('.card-prompt, .card-opt, .card-media, .card-btn').forEach(e => {
        if (vis(e) && inter(ir, R(e))) problems.push('icon overlaps ' + e.className.split(' ')[0]);
      });
    }
    if (!title || !vis(title)) problems.push('CSS variant: title missing');
    else {
      const tr = R(title);
      if (tr.top < F.top + frameH - tol || tr.bottom > bandTop + tol + 1) problems.push('title box outside the top band');
      const span = title.querySelector('.card-title-text');
      const rr = span ? span.getBoundingClientRect() : tr;
      if (rr.top < F.top + frameH - tol || rr.bottom > bandTop + tol) problems.push('title text outside the top band');
      if (rr.left < F.left || rr.right > F.right) problems.push('title text outside the card');
      if (!span || getComputedStyle(span).webkitLineClamp !== '2') problems.push('title is not clamped to 2 lines');
      else if (rr.height > 2 * parseFloat(getComputedStyle(span).lineHeight) + 1) problems.push('title taller than 2 lines');
    }
    if (getComputedStyle(face, '::before').content === 'none') problems.push('CSS variant: no tricolore frame');
  } else if (face.classList.contains('card-tpl')) {
    if (face.querySelector('.card-icon, .card-title')) problems.push('template variant draws its own icon/title');
    if (!face.style.backgroundImage) problems.push('template variant without background');
  }
  return { problems, fit: { fs: p ? parseFloat(getComputedStyle(p).fontSize) : null, brk: face.classList.contains('fit-break'), scroll } };
}

async function check(page, s, label, opts) {
  const r = await page.evaluate(measureFace, opts);
  r.problems.forEach(p => s.fail(label + ': ' + p));
  return r;
}

export default async function (t) {
  for (const fixture of FIXTURES) {
    for (const [w, h] of VIEWPORTS) {
      t.test(`card ${fixture} ${w}x${h}: special cards (text fit, geometry, Hilfe, back)`, async ({ browser }) => {
        const s = soft();
        const page = await newPage(browser, { w, h, lang: 'it', fixture, touch: w < 800 });
        await startGroup(page, MEDIO);
        const tag = `card-${fixture}-${w}x${h}`;
        const variantCss = fixture === 'cards-css';
        for (const sc of SPECIAL) {
          await drawSpecial(page, sc.tile, sc.key);
          await page.waitForTimeout(450);
          const label = `${sc.name}`;
          const isImage = sc.name === 'errore';
          if (isImage) {
            const n = await page.locator('.card-front.card-image').count();
            s.check(n === 1, label + ': immagine card not rendered as card-image');
          } else {
            const cls = await page.evaluate(() => document.querySelector('.card-front').className);
            s.check(variantCss ? !cls.includes('card-tpl') : cls.includes('card-tpl'), `${label}: wrong variant "${cls}" for ${fixture}`);
          }
          const portrait = h > w;
          const rightPill = (w === 390 && h === 844) || (w === 412 && h === 915);
          const allOpts = sc.hilfe && ((sc.name === 'quiz-foto' && [[375, 667], [390, 844], [412, 915], [1280, 800]].some(([a, b]) => a === w && b === h)) || (sc.name === 'quiz-audio' && portrait));
          await check(page, s, label + ' front', { side: 'front', rightPill });
          await shot(page, `${tag}-${sc.name}-front`);
          if (sc.hilfe) {
            await page.click('.btn-aiuto');
            await page.waitForTimeout(150);
            await check(page, s, label + ' hilfe-open', { side: 'front', allOpts });
            await shot(page, `${tag}-${sc.name}-hilfe`);
            await page.locator('.card-opt').first().click();
            await page.waitForTimeout(150);
            await check(page, s, label + ' hilfe-picked', { side: 'front', allOpts });
            await shot(page, `${tag}-${sc.name}-picked`);
          }
          if (await page.locator('.btn-soluzione').count()) {   // PARLA DI TE has no risposta: no back
            await page.click('.btn-soluzione');
            await page.waitForTimeout(700);
            await check(page, s, label + ' back', { side: 'back' });
            await shot(page, `${tag}-${sc.name}-back`);
          }
        }
        s.done();
      });
    }
  }

  // CSS title: max 2 lines + ellipsis, inside the top band, even for a very long category name
  for (const [w, h] of [[320, 568], [390, 844], [844, 390], [667, 375]]) {
    t.test(`card long category name ${w}x${h}: CSS title clamped to 2 lines`, async ({ browser }) => {
      const s = soft();
      const page = await newPage(browser, { w, h, lang: 'it', fixture: 'longtitle', touch: w < 800 });
      await startGroup(page, 0);
      await openCategory(page, T_PARLA);
      await check(page, s, 'front', { side: 'front' });
      const r = await page.evaluate(() => {
        const sp = document.querySelector('.card-front .card-title-text');
        return { text: sp.textContent, clipped: sp.scrollHeight > sp.clientHeight + 1 };
      });
      s.check(r.text.length > 60, 'long name not used');
      s.check(r.clipped, 'name should be longer than 2 lines (clamped), was not');
      await shot(page, `card-longtitle-${w}x${h}`);
      s.done();
    });
  }

  // f) a failing sfondo falls back to the CSS variant
  t.test('card nosfondo: broken sfondo renders the CSS variant (title + frame)', async ({ browser }) => {
    const page = await newPage(browser, { w: 390, h: 844, lang: 'it', fixture: 'nosfondo' });
    await page.waitForFunction(() => window.__app.sfide[1] && window.__app.sfide[1].sfondoBroken === true);
    await startGroup(page, 0);
    await openCategory(page, T_PLURALE);
    const r = await page.evaluate(() => ({
      tpl: document.querySelectorAll('.card-tpl').length,
      title: (document.querySelector('.card-front .card-title') || {}).textContent || '',
      frame: getComputedStyle(document.querySelector('.card-front'), '::before').content
    }));
    eq(r.tpl, 0, 'no template face');
    assert(r.title.length > 0, 'CSS title missing');
    assert(r.frame !== 'none', 'CSS frame missing');
    // other categories still use their template
    await page.locator('.pair.bottom .btn-secondary').click();
    await page.waitForSelector('.tiles');
    await openCategory(page, T_PARLA);
    eq(await page.locator('.card-front.card-tpl').count(), 1, 'other category keeps its template');
  }, { allowErrors: true });   // the missing file is a 404 on purpose

  t.test('card nosfondo: failure arriving while the card is on screen re-renders it as CSS variant', async ({ browser }) => {
    const page = await newPage(browser, { w: 390, h: 844, lang: 'it', fixture: 'nosfondo', goto: false });
    await page.route('**/manca.png', async route => {
      await new Promise(r => setTimeout(r, 1200));
      await route.fulfill({ status: 404, body: 'nope' });
    });
    await load(page);
    await startGroup(page, 0);
    await openCategory(page, T_PLURALE);
    eq(await page.locator('.card-front.card-tpl').count(), 1, 'template shown while the file is still loading');
    await page.waitForFunction(() => window.__app.sfide[1].sfondoBroken === true, null, { timeout: 5000 });
    await page.waitForSelector('.card-front:not(.card-tpl) .card-title');
    assert(await page.locator('.card-front .card-title').count() === 1, 're-rendered face has a title');
    // state survived the re-render (same card)
    assert(await page.evaluate(() => window.__app.card.idx != null), 'card state kept');
  }, { allowErrors: true });   // the missing file is a 404 on purpose

  // g) every sfondo is preloaded before any card is opened
  t.test('card preload: all repo sfondi are fetched as images right after load', async ({ browser }) => {
    const page = await newPage(browser, { w: 390, h: 844 });
    const files = fs.readdirSync(path.join(ROOT, 'assets', 'sfondi')).filter(f => f.endsWith('.png'));
    eq(files.length, 8, 'repo sfondo count');
    await page.waitForFunction(names => {
      const got = performance.getEntriesByType('resource').filter(e => e.initiatorType === 'img').map(e => decodeURIComponent(e.name));
      return names.every(n => got.some(u => u.endsWith('/assets/sfondi/' + n)));
    }, files, { timeout: 6000 });
    eq(await page.locator('.card-flip').count(), 0, 'no card opened yet');
  });

  // h) no-card state shows the category
  for (const [fixture, expectTpl] of [[null, true], ['cards-css', false]]) {
    t.test(`card no-card state (${expectTpl ? 'template' : 'CSS'} variant): category face + message, no pills`, async ({ browser }) => {
      const s = soft();
      for (const [w, h] of [[320, 568], [390, 844], [844, 390]]) {
        const page = await newPage(browser, { w, h, lang: 'de', fixture, touch: w < 800 });
        await startGroup(page, 2);   // Difficile: PARLA DI TE has no card
        await openCategory(page, T_PARLA);
        const r = await page.evaluate(() => {
          const f = document.querySelector('.card-front');
          const txt = f.querySelector('.card-text');
          const title = f.querySelector('.card-title');
          const rect = e => e.getBoundingClientRect();
          return {
            idx: window.__app.card.idx,
            tpl: f.classList.contains('card-tpl'),
            bg: f.style.backgroundImage,
            title: title ? title.textContent : null,
            titleVisible: title ? rect(title).width > 0 && rect(title).height > 0 : null,
            msg: txt ? txt.textContent : '',
            pills: f.querySelectorAll('.card-btn').length,
            more: document.querySelector('.pair.bottom .btn:not(.btn-secondary)').disabled
          };
        });
        const tag = `${w}x${h}`;
        s.check(r.idx == null, tag + ': expected no card');
        s.check(r.msg.length > 0, tag + ': nessuna_carta message missing');
        s.check(r.pills === 0, tag + ': pills on the no-card face');
        s.check(r.more, tag + ': [altra_carta] should be disabled');
        if (expectTpl) s.check(r.tpl && r.bg.includes('assets/sfondi/'), tag + ': template background not set');
        else s.check(!r.tpl && r.titleVisible && r.title.length > 0, tag + ': CSS title not visible');
        await check(page, s, tag + ' no-card', { side: 'front', nocard: true });
        await shot(page, `card-nocard-${expectTpl ? 'tpl' : 'css'}-${tag}`);
      }
      s.done();
    });
  }

  // i) the card-in fade only plays for a newly drawn card
  t.test('card fade: plays for a new card, not after a language switch', async ({ browser }) => {
    const page = await newPage(browser, { w: 390, h: 844, lang: 'de' });
    await startGroup(page, 0);
    const running = () => page.evaluate(() => document.getAnimations().filter(a => a.animationName === 'card-in' && a.playState === 'running').length);
    await page.locator('.tile').nth(T_PLURALE).click();
    await page.waitForSelector('.card-flip');
    assert(await running() >= 1, 'new card should fade in');
    await page.waitForTimeout(500);
    eq(await running(), 0, 'fade finished');
    await page.click('#lang button:not(.active)');
    await page.waitForSelector('.card-flip');
    eq(await running(), 0, 'no fade after language switch');
    // Hilfe + flip re-use the same face: no fade either
    await page.click('.btn-aiuto');
    eq(await running(), 0, 'no fade after Hilfe');
    // [altra_carta] is a new card: fades in again
    await page.waitForTimeout(450);
    await page.locator('.pair.bottom .btn:not(.btn-secondary)').click();
    await page.waitForSelector('.card-flip');
    assert(await running() >= 1, '[altra_carta] card should fade in');
  });

  // j) grid labels never clip
  for (const [w, h] of PORTRAIT) {
    for (const lang of ['de', 'it']) {
      t.test(`card grid labels not clipped ${w}x${h} ${lang}`, async ({ browser }) => {
        const s = soft();
        const page = await newPage(browser, { w, h, lang, touch: true });
        await startGroup(page, 0);
        const bad = await page.evaluate(() => {
          const out = [];
          document.querySelectorAll('.tile').forEach(tile => {
            const n = tile.querySelector('.tile-name'), tr = tile.getBoundingClientRect(), nr = n.getBoundingClientRect();
            const label = n.textContent;
            if (n.scrollWidth > n.clientWidth) out.push(label + ': scrollWidth ' + n.scrollWidth + ' > ' + n.clientWidth);
            if (n.scrollHeight > n.clientHeight) out.push(label + ': scrollHeight ' + n.scrollHeight + ' > ' + n.clientHeight);
            if (nr.left < tr.left - 0.5 || nr.right > tr.right + 0.5 || nr.top < tr.top - 0.5 || nr.bottom > tr.bottom + 0.5) out.push(label + ': label outside its tile');
            if (tile.scrollWidth > tile.clientWidth || tile.scrollHeight > tile.clientHeight) out.push(label + ': tile content overflows');
            // the glyphs themselves (a long word can overflow its box without changing scrollWidth of a clipped parent)
            const r = document.createRange();
            r.selectNodeContents(n);
            const gr = r.getBoundingClientRect();
            if (gr.right > tr.right + 0.5 || gr.left < tr.left - 0.5) out.push(label + ': text outside its tile');
          });
          return out;
        });
        bad.forEach(b => s.fail(b));
        await shot(page, `card-grid-${w}x${h}-${lang}`);
        s.done();
      });
    }
  }
}
