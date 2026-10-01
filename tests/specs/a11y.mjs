// Accessibility: focus management, dialogs, flip focus, Hilfe result, lang="it", accessible names, focus ring.
import {
  newPage, load, startGroup, startPlayers, chooseNumber, openCategory, soft, assert, eq
} from '../lib.mjs';

const T_PLURALE = 1, T_TIMER = 5;   // tile indexes in data/sfide.csv

const active = page => page.evaluate(() => {
  const a = document.activeElement;
  return a ? { tag: a.tagName, fid: a.dataset.fid || null, cls: a.className, inPanel: !!a.closest('.panel') } : null;
});
const notBody = async (page, what) => {
  const a = await active(page);
  assert(a && a.tag !== 'BODY' && a.tag !== 'HTML', 'focus is on <body> after: ' + what);
  return a;
};
const step = async (page, what, action) => { await action(); await page.waitForTimeout(60); return notBody(page, what); };

// open a card of tile `tile` that has Hilfe (re-draw until one does)
async function drawWithHilfe(page, tile) {
  for (let i = 0; i < 30; i++) {
    if (!(await page.locator('.card-flip').count())) await openCategory(page, tile);
    if (await page.locator('.btn-aiuto').count()) return;
    await page.locator('.pair.bottom .btn-secondary').click();
    await page.waitForSelector('.tiles');
  }
  throw new Error('no card with Hilfe');
}

export default async function (t) {
  t.test('a11y focus never on <body>: same-level path, grid, card, flip, back', async ({ browser }) => {
    const page = await newPage(browser, { lang: 'de' });
    let a = await step(page, 'nuova partita', () => page.click('.start .btn'));
    assert(await page.evaluate(() => document.activeElement.classList.contains('question')), 'stesso: focus on the question');
    await step(page, 'si', () => page.click('.btn-yes'));
    await step(page, 'livello', () => page.locator('.btn-level').nth(1).click());
    assert(await page.evaluate(() => document.activeElement.classList.contains('question')), 'quanti: focus on the question');
    await step(page, 'numero 1', () => page.locator('[data-fid="num-1"]').click());
    assert(await page.evaluate(() => document.activeElement.classList.contains('rows')), 'players: focus on the rows');
    await step(page, 'inizia', () => page.click('.btn-start'));
    assert(await page.evaluate(() => document.activeElement.classList.contains('topfield')), 'grid: focus on the top field');
    await step(page, 'tile', () => page.locator('.tile').nth(T_PLURALE).click());
    assert(await page.evaluate(() => document.activeElement.classList.contains('card-front')), 'card: focus on the front');
    await page.waitForTimeout(400);
    // flip: focus moves to the back face; flipping back returns it to [soluzione]
    await step(page, 'soluzione', () => page.click('.btn-soluzione'));
    a = await active(page);
    assert(a.cls.includes('card-back') && a.fid === 'back', 'focus on the back face, got ' + JSON.stringify(a));
    eq(await page.evaluate(() => document.activeElement.getAttribute('role')), 'button');
    await page.waitForTimeout(600);
    await step(page, 'flip back (Enter)', () => page.keyboard.press('Enter'));
    a = await active(page);
    eq(a.fid, 'soluzione', 'flipping back returns the focus to [soluzione]');
    await page.waitForTimeout(600);
    await step(page, 'flip again', () => page.click('.btn-soluzione'));
    await page.waitForTimeout(600);
    await step(page, 'flip back (Space)', () => page.keyboard.press(' '));
    eq((await active(page)).fid, 'soluzione');
    await page.waitForTimeout(450);
    await step(page, 'altra carta', () => page.locator('[data-fid="altra"]').click());
    eq((await active(page)).fid, 'altra', 'same screen: focus stays on [altra_carta]');
    await step(page, 'chiudi', () => page.locator('[data-fid="chiudi"]').click());
    assert(await page.evaluate(() => document.activeElement.classList.contains('topfield')), 'back on the grid: top field');
    await step(page, 'esci', () => page.locator('[data-fid="esci"]').click());
    await step(page, 'annulla', () => page.locator('[data-fid="annulla"]').click());
    eq((await active(page)).fid, 'esci');
    await step(page, 'impostazioni', () => page.locator('[data-fid="impostazioni"]').click());
    assert(await page.evaluate(() => document.activeElement.classList.contains('question')), 'settings: focus on the question');
    await step(page, 'no', () => page.click('.btn-no'));
    await step(page, 'numero', () => page.locator('[data-fid="num-3"]').click());
    assert(await page.evaluate(() => document.activeElement.classList.contains('rows')), 'players: focus on the rows');
  });

  t.test('a11y focus never on <body>: player path, popups, top field, exit', async ({ browser }) => {
    const page = await newPage(browser, { lang: 'it' });
    await step(page, 'nuova partita', () => page.click('.start .btn'));
    await step(page, 'no', () => page.click('.btn-no'));
    await step(page, 'numero 2', () => page.locator('[data-fid="num-2"]').click());
    await page.locator('.name-input').nth(0).fill('Anna');
    await page.locator('.name-input').nth(1).fill('Bruno');
    for (let i = 0; i < 2; i++) {
      await step(page, 'level field ' + i, () => page.locator('[data-fid="lvl-' + i + '"]').click());
      eq((await active(page)).inPanel, true, 'level popup: focus inside');
      await step(page, 'pick level ' + i, () => page.locator('.panel .btn-level').nth(i).click());
      eq((await active(page)).fid, 'lvl-' + i, 'level popup closed: focus back on the level field');
    }
    // language switch with the focus on the language button
    await step(page, 'lang de', () => page.click('[data-fid="lang-de"]'));
    eq((await active(page)).fid, 'lang-de', 'language switch keeps the focus on the language button');
    await step(page, 'inizia', () => page.click('.btn-start'));
    await step(page, 'top field', () => page.click('.topfield-btn'));
    eq((await active(page)).inPanel, true);
    await step(page, 'pick player', () => page.locator('.panel .btn-player').nth(1).click());
    eq((await active(page)).fid, 'topfield');
    await step(page, 'tile', () => page.locator('.tile').nth(T_TIMER).click());
    await page.waitForTimeout(400);
    await step(page, 'timer start', () => page.click('.btn-timer'));
    eq((await active(page)).fid, 'timer');
    await step(page, 'exit via chiudi', () => page.locator('[data-fid="chiudi"]').click());
    await step(page, 'esci', () => page.locator('[data-fid="esci"]').click());
    await step(page, 'si (exit)', () => page.locator('[data-fid="esci-si"]').click());
    assert(await page.evaluate(() => document.activeElement.tagName === 'H1'), 'start: focus on the heading');
  });

  t.test('a11y language switch on the card screen keeps the focus on the language button', async ({ browser }) => {
    const page = await newPage(browser, { lang: 'de' });
    await startGroup(page, 0);
    await openCategory(page, T_PLURALE);
    for (const code of ['it', 'de', 'it']) {
      await page.click('[data-fid="lang-' + code + '"]');
      await page.waitForTimeout(60);
      eq((await active(page)).fid, 'lang-' + code);
      eq(await page.locator('[data-fid="lang-' + code + '"]').getAttribute('aria-pressed'), 'true');
    }
    // keyboard: Enter on the other language button
    await page.focus('[data-fid="lang-de"]');
    await page.keyboard.press('Enter');
    eq((await active(page)).fid, 'lang-de');
    // flipped card + language switch: the focus is not pulled to the back face
    await page.click('.btn-soluzione');
    await page.waitForTimeout(600);
    await page.click('[data-fid="lang-it"]');
    await page.waitForTimeout(60);
    eq((await active(page)).fid, 'lang-it');
    eq(await page.locator('.card-flip.flipped').count(), 1, 'still flipped');
  });

  // ---- dialogs ----
  const DIALOGS = [
    { name: 'exit', opener: 'esci', open: async page => { await startGroup(page, 1); await page.click('[data-fid="esci"]'); } },
    { name: 'player popup', opener: 'topfield', open: async page => { await startPlayers(page, ['Anna', 'Bruno'], [0, 1]); await page.click('[data-fid="topfield"]'); } },
    { name: 'level popup', opener: 'lvl-0', open: async page => { await chooseNumber(page, 2); await page.click('[data-fid="lvl-0"]'); } }
  ];
  for (const d of DIALOGS) {
    t.test(`a11y dialog ${d.name}: label, first focus, Tab trap, inert outside, Escape / backdrop / button return focus`, async ({ browser }) => {
      const s = soft();
      const page = await newPage(browser, { lang: 'de' });
      const reopen = async () => {
        if (!(await page.locator('.panel').count())) await page.click('[data-fid="' + d.opener + '"]');
        await page.waitForSelector('.panel');
      };
      await d.open(page);
      await page.waitForSelector('.panel');
      // label
      const lab = await page.evaluate(() => {
        const p = document.querySelector('.panel');
        const id = p.getAttribute('aria-labelledby');
        const h = id && document.getElementById(id);
        return { role: p.getAttribute('role'), modal: p.getAttribute('aria-modal'), tag: h && h.tagName, text: h ? h.textContent.trim() : '' };
      });
      s.check(lab.role === 'dialog' && lab.modal === 'true', 'role=dialog aria-modal');
      s.check(lab.tag === 'H2' && lab.text.length > 0, 'aria-labelledby -> h2 with text: ' + JSON.stringify(lab));
      // focus starts on the first button
      const first = await page.evaluate(() => document.activeElement === document.querySelector('.panel button'));
      s.check(first, 'focus starts on the first button');
      // everything outside the backdrop is inert
      const inert = await page.evaluate(() => {
        const bad = [];
        [...document.getElementById('app').children].forEach(c => { if (!c.classList.contains('backdrop') && !c.inert) bad.push(c.className || c.tagName); });
        if (!document.getElementById('banner').inert) bad.push('#banner');
        if (document.querySelector('.backdrop').inert) bad.push('the backdrop itself');
        return bad;
      });
      s.check(inert.length === 0, 'inert wrong for: ' + inert.join(', '));
      // Tab x10, Shift+Tab x4: the focus never leaves the panel
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab');
        if (!(await active(page)).inPanel) { s.fail('Tab #' + (i + 1) + ' left the dialog'); break; }
      }
      for (let i = 0; i < 4; i++) {
        await page.keyboard.press('Shift+Tab');
        if (!(await active(page)).inPanel) { s.fail('Shift+Tab #' + (i + 1) + ' left the dialog'); break; }
      }
      // Escape
      await page.keyboard.press('Escape');
      await page.waitForTimeout(60);
      s.check((await page.locator('.panel').count()) === 0, 'Escape closes');
      s.check((await active(page)).fid === d.opener, 'Escape: focus back on ' + d.opener + ', got ' + JSON.stringify(await active(page)));
      // backdrop click
      await reopen();
      await page.mouse.click(4, 4);
      await page.waitForTimeout(60);
      s.check((await page.locator('.panel').count()) === 0, 'backdrop click closes');
      s.check((await active(page)).fid === d.opener, 'backdrop: focus back on ' + d.opener + ', got ' + JSON.stringify(await active(page)));
      // a button closes (the cancel button)
      await reopen();
      await page.click('.panel [data-fid="annulla"]');
      await page.waitForTimeout(60);
      s.check((await page.locator('.panel').count()) === 0, 'button closes');
      s.check((await active(page)).fid === d.opener, 'button: focus back on ' + d.opener + ', got ' + JSON.stringify(await active(page)));
      // after closing nothing is inert any more
      const stillInert = await page.evaluate(() => [...document.querySelectorAll('#app *, #banner')].filter(e => e.inert).length);
      s.check(stillInert === 0, stillInert + ' elements still inert after closing');
      s.done();
    });
  }

  // ---- Hilfe: result glyphs, hidden words, live region ----
  t.test('a11y Hilfe pick: check + cross glyphs (aria-hidden), hidden words, live region, focus stays', async ({ browser }) => {
    const s = soft();
    const page = await newPage(browser, { lang: 'de' });
    await startGroup(page, 0);
    await drawWithHilfe(page, T_PLURALE);
    await page.click('.btn-aiuto');
    await page.waitForTimeout(60);
    eq((await active(page)).fid, 'opt-0', 'after [aiuto] the focus is on the first option');
    const grp = await page.evaluate(() => {
      const b = document.querySelector('.card-opts');
      const live = b.querySelector('[role=status]');
      return { role: b.getAttribute('role'), label: b.getAttribute('aria-label'), live: !!live, polite: live && live.getAttribute('aria-live'), empty: live && live.textContent === '' };
    });
    s.check(grp.role === 'group' && !!grp.label, 'options group with a label');
    s.check(grp.live && grp.polite === 'polite' && grp.empty, 'polite live region exists before the pick');
    const T = await page.evaluate(() => ({ g: window.__app.testi.giusto.de, s: window.__app.testi.sbagliato.de }));
    eq(T.g, 'richtig');
    eq(T.s, 'falsch');
    const state = () => page.evaluate(() => {
      const h = window.__app.card.hilfe;
      return { order: h.order, picked: h.picked, opts: [...document.querySelectorAll('.card-opt')].map(b => ({
        text: b.querySelector('.opt-text').textContent,
        glyph: b.querySelector('.glyph') ? b.querySelector('.glyph').textContent : null,
        glyphHidden: b.querySelector('.glyph') ? b.querySelector('.glyph').getAttribute('aria-hidden') : null,
        sr: b.querySelector('.sr-only') ? b.querySelector('.sr-only').textContent : null,
        cls: b.className, aria: b.getAttribute('aria-disabled'), disabled: b.disabled })),
        live: document.querySelector('.card-opts [role=status]').textContent };
    });
    // wrong pick
    const before = await state();
    const wrongPos = before.order.findIndex(i => i !== 0);
    await page.locator('.card-opt').nth(wrongPos).click();
    await page.waitForTimeout(60);
    let st = await state();
    const correctPos = st.order.indexOf(0);
    s.check(st.opts[correctPos].glyph === '✓' && st.opts[correctPos].glyphHidden === 'true', 'correct option shows ✓ (aria-hidden)');
    s.check((st.opts[correctPos].sr || '').includes(T.g), 'correct option hidden word "' + T.g + '": ' + st.opts[correctPos].sr);
    s.check(st.opts[wrongPos].glyph === '✗' && st.opts[wrongPos].glyphHidden === 'true', 'tapped wrong option shows ✗ (aria-hidden)');
    s.check((st.opts[wrongPos].sr || '').includes(T.s), 'wrong option hidden word "' + T.s + '": ' + st.opts[wrongPos].sr);
    const third = st.opts.findIndex((o, p) => p !== wrongPos && p !== correctPos);
    s.check(st.opts[third].glyph === null && st.opts[third].sr === null, 'the third option has no glyph');
    s.check(st.live.includes(T.s) && st.live.includes(T.g), 'live region announces the result: ' + st.live);
    s.check(st.opts.every(o => o.aria === 'true'), 'options marked aria-disabled after the pick');
    s.check((await active(page)).fid === 'opt-' + wrongPos, 'focus stays on the tapped option');
    // a second tap does nothing
    await page.locator('.card-opt').nth(third).evaluate(e => e.click());   // aria-disabled: Playwright would wait forever
    s.check((await state()).picked === st.picked, 'second tap ignored');
    // the result survives a language switch (re-render)
    await page.click('[data-fid="lang-it"]');
    st = await state();
    s.check(st.opts[correctPos].glyph === '✓' && st.opts[wrongPos].glyph === '✗', 'glyphs survive a re-render');
    s.check(st.opts[correctPos].sr.includes('giusto') && st.opts[wrongPos].sr.includes('sbagliato'), 'hidden words follow the language');
    s.done();

    // correct pick on another card
    await page.click('[data-fid="chiudi"]');
    await page.waitForSelector('.tiles');
    await drawWithHilfe(page, T_PLURALE);
    await page.click('.btn-aiuto');
    const pos0 = await page.evaluate(() => window.__app.card.hilfe.order.indexOf(0));
    await page.locator('.card-opt').nth(pos0).click();
    await page.waitForTimeout(60);
    st = await state();
    eq(st.live, 'giusto', 'live text for a correct pick (it)');
    eq(st.opts.filter(o => o.glyph === '✗').length, 0, 'no cross on a correct pick');
    eq(st.opts.filter(o => o.glyph === '✓').length, 1);
  });

  // ---- lang="it" on Italian content ----
  t.test('a11y lang=it on card faces, titles, tile names, options and the answer; UI text keeps the UI language', async ({ browser }) => {
    const s = soft();
    const page = await newPage(browser, { lang: 'de', fixture: 'cards-css' });
    await startGroup(page, 1);
    const names = await page.evaluate(() => [...document.querySelectorAll('.tile-name')].map(n => n.lang));
    s.check(names.length > 0 && names.every(l => l === 'it'), 'tile names lang=it: ' + names.join());
    await openCategory(page, T_PLURALE);
    const f = await page.evaluate(() => {
      const L = sel => { const e = document.querySelector(sel); return e ? (e.closest('[lang]') || {}).lang : null; };
      return { front: document.querySelector('.card-front').lang, title: L('.card-front .card-title-text'), text: L('.card-front .card-text'),
        pills: L('.card-actions .card-btn'), doc: document.documentElement.lang };
    });
    s.check(f.front === 'it', 'card front lang=it');
    s.check(f.title === 'it', 'card title lang=it');
    s.check(f.text === 'it', 'card text lang=it');
    s.check(f.pills === f.doc, 'the pills ([aiuto]/[soluzione]) keep the UI language, got ' + f.pills);
    if (await page.locator('.btn-aiuto').count()) {
      await page.click('.btn-aiuto');
      const o = await page.evaluate(() => [...document.querySelectorAll('.card-opt .opt-text')].map(x => x.lang));
      s.check(o.length === 3 && o.every(l => l === 'it'), 'option texts lang=it: ' + o.join());
    }
    await page.click('.btn-soluzione');
    await page.waitForTimeout(600);
    const b = await page.evaluate(() => ({ back: document.querySelector('.card-back').lang, ans: (document.querySelector('.card-back .card-text').closest('[lang]') || {}).lang }));
    s.check(b.back === 'it' && b.ans === 'it', 'answer lang=it');
    s.done();
  });

  // ---- accessible names ----
  // Playwright's aria snapshot: every button / textbox line must carry a name (`- button "Name"`).
  async function checkNames(page, s, label) {
    const snap = await page.locator('body').ariaSnapshot();
    snap.split('\n').forEach(line => {
      if (/^\s*- (button|textbox|link|checkbox|combobox)(\s*\[[^\]]*\])*:?\s*$/.test(line)) s.fail(label + ': nameless control: ' + line.trim());
    });
    const bad = await page.evaluate(() => [...document.querySelectorAll('button, input, [role=button]')].filter(e => {
      if (e.closest('[inert], [hidden]') || e.hidden) return false;
      const name = (e.getAttribute('aria-label') || (e.getAttribute('aria-labelledby') && document.getElementById(e.getAttribute('aria-labelledby')) ? document.getElementById(e.getAttribute('aria-labelledby')).textContent : '') || e.textContent || e.value || '').trim();
      return !name;
    }).map(e => e.tagName + '.' + e.className));
    bad.forEach(b => s.fail(label + ': no accessible name: ' + b));
  }

  t.test('a11y every button and input has an accessible name; inputs and level fields are labelled', async ({ browser }) => {
    const s = soft();
    const page = await newPage(browser, { lang: 'de' });
    await checkNames(page, s, 'start');
    await page.click('.start .btn');
    await checkNames(page, s, 'stesso');
    await page.click('.btn-yes');
    await checkNames(page, s, 'livello');
    await page.locator('.btn-level').nth(0).click();
    await checkNames(page, s, 'quanti');
    await page.locator('.btn-num').nth(1).click();
    await checkNames(page, s, 'giocatori-prefilled');
    await page.click('.btn-start');
    await checkNames(page, s, 'grid-group');
    await openCategory(page, T_PLURALE);
    await checkNames(page, s, 'card');
    if (await page.locator('.btn-aiuto').count()) { await page.click('.btn-aiuto'); await checkNames(page, s, 'card-hilfe'); }
    await page.click('.btn-soluzione');
    await page.waitForTimeout(600);
    await checkNames(page, s, 'card-back');
    await load(page);
    await startGroup(page, 0);
    await openCategory(page, T_TIMER);
    await checkNames(page, s, 'card-timer');
    // players: labels
    await load(page);
    await chooseNumber(page, 3);
    await checkNames(page, s, 'giocatori');
    const lab = await page.evaluate(() => ({
      inputs: [...document.querySelectorAll('.name-input')].map(i => i.getAttribute('aria-label')),
      fields: [...document.querySelectorAll('.level-field')].map(b => b.getAttribute('aria-label'))
    }));
    eq(lab.inputs.join('|'), 'Spieler 1|Spieler 2|Spieler 3');
    eq(lab.fields[0], 'Spieler 1: Niveau – ', 'level field before a level is chosen');
    await page.locator('.level-field').nth(1).click();
    await checkNames(page, s, 'popup-level');
    await page.locator('.panel .btn-level').nth(0).click();
    eq(await page.locator('.level-field').nth(1).getAttribute('aria-label'), 'Spieler 2: Niveau – Anfänger', 'level field with a level');
    await page.click('[data-fid="lang-it"]');
    eq(await page.locator('.level-field').nth(1).getAttribute('aria-label'), 'Giocatore 2: Livello – Facile');
    eq(await page.locator('.name-input').nth(2).getAttribute('aria-label'), 'Giocatore 3');
    // players grid + popups
    await load(page);
    await startPlayers(page, ['Anna', 'Bruno'], [0, 1]);
    await checkNames(page, s, 'grid-players');
    await page.click('.topfield-btn');
    await checkNames(page, s, 'popup-player');
    await page.keyboard.press('Escape');
    await page.click('[data-fid="esci"]');
    await checkNames(page, s, 'dialog-exit');
    // banner
    const b = await newPage(browser, { lang: 'de', fixture: 'banner' });
    await checkNames(b, s, 'banner');
    s.done();
  });

  // ---- visible focus ----
  t.test('a11y keyboard focus on a .btn has a visible outline (>= 2px)', async ({ browser }) => {
    const page = await newPage(browser, { lang: 'de' });
    const ring = () => page.evaluate(() => {
      const a = document.activeElement, cs = getComputedStyle(a);
      return { isBtn: a.classList.contains('btn'), w: parseFloat(cs.outlineWidth), style: cs.outlineStyle, offset: cs.outlineOffset };
    });
    let r = null;
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab');
      r = await ring();
      if (r.isBtn) break;
    }
    assert(r && r.isBtn, 'Tab reaches the start button');
    assert(r.w >= 2 && r.style !== 'none', 'start button outline: ' + JSON.stringify(r));
    await page.keyboard.press('Enter');   // keyboard-only on to the next screen
    await page.waitForSelector('.btn-yes');
    await page.keyboard.press('Tab');
    r = await ring();
    assert(r.isBtn && r.w >= 2 && r.style !== 'none', '.btn on the stesso screen: ' + JSON.stringify(r));
    // language buttons: inset ring (their container clips)
    await page.focus('[data-fid="lang-it"]');
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    const l = await page.evaluate(() => { const cs = getComputedStyle(document.activeElement); return { fid: document.activeElement.dataset.fid, w: parseFloat(cs.outlineWidth), off: parseFloat(cs.outlineOffset) }; });
    assert(l.fid === 'lang-it' && l.w >= 2 && l.off < 0, 'language button ring is inset: ' + JSON.stringify(l));
  });
}
