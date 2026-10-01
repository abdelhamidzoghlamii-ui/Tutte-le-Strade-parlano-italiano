// Game model: a game is ALWAYS a list of players (U1), turns (U2), top-field dialog (U3), hide Hilfe (U5),
// saved game v2, and the Jules fixes J-4 (hyphens), J-5 (save failure warning), J-9 (value in the messages).
import fs from 'node:fs';
import path from 'node:path';
import {
  ROOT, newPage, startGroup, startPlayers, openCategory, shot, assert, eq
} from '../lib.mjs';

const KEY = 'tlspi-partita';
const FACILE = 0, MEDIO = 1;
const T_INDOVINA = 3, T_QUIZ = 7;   // tile indexes in data/sfide.csv. QUIZ has cards at Medio only, INDOVINA at every level.

// UI texts and level names read from the CSVs (never hardcoded here)
const csv = f => fs.readFileSync(path.join(ROOT, 'data', f), 'utf8').replace(/^﻿/, '').split(/\r?\n/).slice(1).map(l => l.split(';')).filter(r => r[0]);
const TXT = {};
csv('testi_ui.csv').forEach(([k, de, it]) => { TXT[k] = { de, it }; });
const LV = csv('livelli.csv').map(([id, de]) => ({ it: id, de }));   // livelli.csv order
const lvName = (i, lang) => LV[i][lang];

const top = page => page.locator('.topfield').innerText();
const state = (page, fn, arg) => page.evaluate(fn, arg);
const attivo = page => page.evaluate(() => window.__app.setup.attivo);
const levels = page => page.evaluate(() => window.__app.setup.giocatori.map(p => p.livello));
const getSave = page => page.evaluate(k => localStorage.getItem(k), KEY);
const bottom = (page, n) => page.locator('.pair.bottom .btn').nth(n);
const chiudi = async page => { await bottom(page, 0).click(); await page.waitForSelector('.tiles'); };
const altra = page => bottom(page, 1);

// grid -> [impostazioni] -> [nuova_partita] -> [si]: fresh setup (stesso screen)
async function newGameViaEdit(page) {
  await page.click('[data-fid="impostazioni"]');
  await page.click('[data-fid="nuova"]');
  await page.click('[data-fid="nuova-si"]');
  await page.waitForSelector('.question');
}

async function reloadResume(page) {
  await page.goto(page.fixtureBase);
  await page.waitForSelector('#app .start');
  await page.locator('.backdrop[data-dlg="riprendi"] .btn-yes').click();
  await page.waitForFunction(() => !document.querySelector('.backdrop'));
}
const cardNow = page => page.evaluate(() => { const s = window.__app; return s.card && s.card.idx != null ? s.carte[s.card.idx] : null; });
const optTexts = page => page.locator('.card-opt .opt-text').allTextContents();

export default function (t) {
  /* ------------------------------------------------------------------ U1 */
  t.test('players U1: Sì path = level once -> count -> names, every level prefilled and editable', async ({ browser }) => {
    const page = await newPage(browser, { lang: 'de' });
    await page.click('.start .btn');
    await page.click('.btn-yes');
    eq(await page.locator('.btn-level').count(), LV.length, 'livello screen');
    await page.locator('.btn-level').nth(MEDIO).click();
    await page.waitForSelector('.btn-num');
    eq(await page.locator('.btn-num').count(), 6, 'quanti screen: 1..6');
    await page.locator('.btn-num').nth(2).click();
    await page.waitForSelector('.name-input');
    eq(await page.locator('.name-input').count(), 3, 'names for 3 players');
    const fields = await page.locator('.level-field').allInnerTexts();
    eq(fields.join('|'), [1, 2, 3].map(() => lvName(MEDIO, 'de')).join('|'), 'every level prefilled with the chosen one');
    assert(await page.locator('.level-field.empty').count() === 0, 'no empty field');
    assert(!(await page.locator('.btn-start').isDisabled()), 'inizia enabled right away');
    await shot(page, 'players-01-giocatori-prefilled');
    // still editable: only player 2 changes
    await page.locator('.level-field').nth(1).click();
    await page.locator('.panel .btn-level').nth(FACILE).click();
    eq((await levels(page)).join('|'), ['Medio', 'Facile', 'Medio'].join('|'));
    await page.click('.btn-start');
    await page.waitForSelector('.tiles');
    eq(await attivo(page), 0);
    // game -> settings -> Sì -> another level re-prefills everybody (the explicit "same level" answer)
    await newGameViaEdit(page);   // [impostazioni] = edit players; the setup screens are reached through [nuova_partita]
    await page.click('.btn-yes');
    await page.locator('.btn-level').nth(FACILE).click();
    await page.locator('.btn-num').nth(2).click();
    eq((await levels(page)).join('|'), 'Facile|Facile|Facile', 're-answering Sì re-prefills');
  });

  t.test('players U1: No path = count -> names + a level per player (empty until chosen)', async ({ browser }) => {
    const page = await newPage(browser, { lang: 'it' });
    await page.click('.start .btn');
    await page.click('.btn-no');
    eq(await page.locator('.btn-num').count(), 6, 'quanti screen');
    await page.locator('.btn-num').nth(1).click();
    await page.waitForSelector('.name-input');
    eq(await page.locator('.name-input').count(), 2);
    eq(await page.locator('.level-field.empty').count(), 2, 'levels empty');
    assert(await page.locator('.btn-start').isDisabled(), 'inizia disabled');
    await page.locator('.level-field').nth(0).click();
    await page.locator('.panel .btn-level').nth(FACILE).click();
    assert(await page.locator('.btn-start').isDisabled(), 'still disabled with one level missing');
    await page.locator('.level-field').nth(1).click();
    await page.locator('.panel .btn-level').nth(2).click();
    assert(!(await page.locator('.btn-start').isDisabled()), 'enabled');
    await page.click('.btn-start');
    await page.waitForSelector('.tiles');
    eq((await levels(page)).join('|'), 'Facile|Difficile');
  });

  t.test('players U1: blank names show "Spieler n" (DE) / "Giocatore n" (IT)', async ({ browser }) => {
    const page = await newPage(browser, { lang: 'de' });
    await startGroup(page, MEDIO, 2);
    eq(await top(page), TXT.tocca_a.de + ' ' + TXT.giocatore.de + ' 1 – ' + lvName(MEDIO, 'de'));
    assert((await top(page)).includes('Spieler 1'), 'Spieler 1');
    await page.click('.topfield-btn');
    eq((await page.locator('.panel .btn-player').allInnerTexts()).join('|'),
      ['Spieler 1 – ' + lvName(MEDIO, 'de'), 'Spieler 2 – ' + lvName(MEDIO, 'de')].join('|'));
    await page.keyboard.press('Escape');
    await page.click('[data-fid="lang-it"]');
    assert((await top(page)).includes('Giocatore 1'), 'Giocatore 1: ' + await top(page));
    // a typed name wins, whitespace-only is not a name... only the empty string is the placeholder (existing behaviour)
    await newGameViaEdit(page);
    await page.click('.btn-no');
    await page.locator('.btn-num').nth(1).click();
    eq(await page.locator('.name-input').nth(1).getAttribute('placeholder'), 'Giocatore 2');
  });

  /* ------------------------------------------------------------------ U2 */
  t.test('players U2: top field = "<tocca_a> <name> – <level>" in DE and IT, on the grid and on the card, level colour', async ({ browser }) => {
    const page = await newPage(browser, { lang: 'de' });
    await startPlayers(page, ['Anna', 'Bruno'], [FACILE, MEDIO]);
    for (const lang of ['de', 'it']) {
      await page.click('[data-fid="lang-' + lang + '"]');
      eq(await top(page), TXT.tocca_a[lang] + ' Anna – ' + lvName(FACILE, lang), 'grid ' + lang);
    }
    eq(await top(page), 'Tocca a: Anna – Facile', 'IT literal');
    await page.click('[data-fid="lang-de"]');
    eq(await top(page), 'Am Zug: Anna – Anfänger', 'DE literal');
    const bg = await page.locator('.topfield').evaluate(e => getComputedStyle(e).backgroundColor);
    eq(bg, 'rgb(123, 224, 123)', 'level colour (#7BE07B) as background');
    await shot(page, 'players-02-grid-top-field-de');
    await openCategory(page, T_INDOVINA);
    eq(await top(page), 'Am Zug: Anna – Anfänger', 'card screen');
    assert(await page.locator('div.topfield').count() === 1 && await page.locator('.topfield-btn').count() === 0, 'not clickable on the card');
    await page.click('[data-fid="lang-it"]');
    eq(await top(page), 'Tocca a: Anna – Facile', 'card screen IT');
    await shot(page, 'players-03-card-top-field-it');
  });

  t.test('players U2: [chiudi] advances 1 -> 2 -> 3 -> 1; [altra_carta] keeps the player; popup pick sets the player', async ({ browser }) => {
    const page = await newPage(browser, { lang: 'de' });
    await startPlayers(page, ['Anna', 'Bruno', 'Chiara'], [MEDIO, MEDIO, MEDIO]);
    const seq = [];
    for (let i = 0; i < 4; i++) {
      seq.push(await attivo(page));
      await openCategory(page, T_INDOVINA);
      eq(await attivo(page), seq[i], 'opening a card does not pass the turn');
      if (i === 0) {
        await altra(page).click();
        await page.waitForTimeout(450);
        await altra(page).click();
        await page.waitForTimeout(450);
        eq(await attivo(page), 0, '[altra_carta] keeps the same player');
        eq(await top(page), 'Am Zug: Anna – Mittel');
      }
      await chiudi(page);
    }
    eq(seq.join(','), '0,1,2,0', 'wraps after the last player');
    eq(await attivo(page), 1);
    eq(await top(page), 'Am Zug: Bruno – Mittel', 'grid shows the next player');
    // manual pick from the popup
    await page.click('.topfield-btn');
    await page.locator('.panel .btn-player').nth(2).click();
    await page.waitForFunction(() => !document.querySelector('.backdrop'));
    eq(await attivo(page), 2);
    eq(await top(page), 'Am Zug: Chiara – Mittel');
    // ... and the turn continues from there
    await openCategory(page, T_INDOVINA);
    await chiudi(page);
    eq(await attivo(page), 0, 'after Chiara comes Anna');
  });

  /* ------------------------------------------------------------------ U3 */
  t.test('players U3: popup = title, level section, players section; a level change touches ONLY this player', async ({ browser }) => {
    const page = await newPage(browser, { lang: 'de' });
    await startGroup(page, MEDIO, 3);   // all three start at the same level
    await page.click('.topfield-btn');
    await page.waitForSelector('.backdrop .panel');
    const info = await page.evaluate(() => {
      const p = document.querySelector('.backdrop .panel'), h = p.querySelector('h2');
      const secs = [...p.querySelectorAll('.dlg-section')].map(s => ({
        head: s.querySelector('h3').textContent, labelled: s.getAttribute('aria-labelledby') === s.querySelector('h3').id,
        btns: [...s.querySelectorAll('button')].map(b => ({ txt: b.textContent, marked: b.classList.contains('marked'), pressed: b.getAttribute('aria-pressed') }))
      }));
      return {
        title: h.textContent, role: p.getAttribute('role'), modal: p.getAttribute('aria-modal'), labelled: p.getAttribute('aria-labelledby') === h.id,
        focusFirst: document.activeElement === p.querySelector('button'),
        inert: [...document.getElementById('app').children].filter(c => !c.classList.contains('backdrop')).every(c => c.inert),
        secs, cancel: p.querySelector('.btn-cancel').textContent
      };
    });
    eq(info.title, TXT.tocca_a.de + ' Spieler 1', 'dialog title');
    eq(info.role, 'dialog'); eq(info.modal, 'true'); assert(info.labelled, 'aria-labelledby'); assert(info.focusFirst, 'focus on the first button'); assert(info.inert, 'background inert');
    eq(info.secs.length, 2, 'two sections');
    eq(info.secs[0].head, 'Niveau von Spieler 1', 'level section heading (livello_di)');
    eq(info.secs[1].head, TXT.scegli_giocatore.de, 'players section heading');
    assert(info.secs.every(s => s.labelled), 'sections labelled by their heading');
    eq(info.secs[0].btns.map(b => b.txt).join('|'), LV.map(l => l.de).join('|'), 'one button per level');
    eq(info.secs[0].btns.map(b => b.marked).join(','), 'false,true,false', 'current level marked');
    eq(info.secs[0].btns[MEDIO].pressed, 'true');
    eq(info.secs[1].btns.length, 3, 'one button per player');
    eq(info.secs[1].btns.map(b => b.marked).join(','), 'true,false,false', 'current player marked');
    eq(info.cancel, TXT.annulla.de);
    await shot(page, 'players-04-popup-de');
    // annulla changes nothing
    await page.click('.panel .btn-cancel');
    eq((await levels(page)).join('|'), 'Medio|Medio|Medio');
    assert(await page.evaluate(() => document.activeElement.dataset.fid === 'topfield'), 'focus returns to the top field');
    // Escape too
    await page.click('.topfield-btn');
    await page.keyboard.press('Escape');
    assert(await page.evaluate(() => !document.querySelector('.backdrop') && document.activeElement.dataset.fid === 'topfield'), 'Escape closes, focus back');
    // change the level of player 1 only
    await page.click('.topfield-btn');
    await page.locator('.panel .btn-level').nth(FACILE).click();
    await page.waitForFunction(() => !document.querySelector('.backdrop'));
    eq((await levels(page)).join('|'), 'Facile|Medio|Medio', 'only the current player changed');
    eq(await attivo(page), 0, 'the turn did not move');
    eq(await top(page), 'Am Zug: Spieler 1 – Anfänger');
    assert(await page.evaluate(() => document.activeElement.dataset.fid === 'topfield'), 'focus back on the top field');
    // the popup now shows the new state
    await page.click('.topfield-btn');
    eq(await page.locator('.panel .btn-level.marked').innerText(), 'Anfänger');
    eq((await page.locator('.panel .btn-player').allInnerTexts()).join('|'), ['Spieler 1 – Anfänger', 'Spieler 2 – Mittel', 'Spieler 3 – Mittel'].join('|'));
    await page.keyboard.press('Escape');
  });

  t.test('players U3: the next card is drawn at the new level (QUIZ has Medio cards only)', async ({ browser }) => {
    const page = await newPage(browser, { lang: 'de' });
    await startGroup(page, MEDIO, 2);
    await openCategory(page, T_QUIZ);
    assert(await cardNow(page), 'Medio: a QUIZ card');
    await chiudi(page);   // -> player 2 (still Medio); back to player 1 below
    await page.click('.topfield-btn');
    await page.locator('.panel .btn-player').nth(0).click();
    await page.click('.topfield-btn');
    await page.locator('.panel .btn-level').nth(FACILE).click();
    await page.waitForFunction(() => !document.querySelector('.backdrop'));
    await openCategory(page, T_QUIZ);
    eq(await cardNow(page), null, 'Facile: no QUIZ card');
    await shot(page, 'players-05-no-card-new-level');
    await chiudi(page);   // -> player 2: Medio, untouched
    eq(await top(page), 'Am Zug: Spieler 2 – Mittel');
    await openCategory(page, T_QUIZ);
    assert(await cardNow(page), 'player 2 is still Medio: a QUIZ card');
    await chiudi(page);   // -> player 1 (Facile)
    await openCategory(page, T_INDOVINA);
    const c = await cardNow(page);
    assert(c && c.livelli.includes('Facile'), 'INDOVINA card drawn for Facile');
    eq(await page.evaluate(() => Object.keys(window.__app.last).filter(k => k.endsWith('|Facile')).length), 1, 'no-repeat pool of the new level');
  });

  /* ------------------------------------------------------------------ U5 */
  async function openHilfeCard(page) {
    await openCategory(page, T_INDOVINA);   // at Medio every INDOVINA card has 3 options
    assert(await page.locator('[data-fid="aiuto"]').count() === 1, '[aiuto] pill');
  }

  t.test('players U5: [nascondi] hides the options, [aiuto] shows them again in the SAME order, a locked pick stays locked', async ({ browser }) => {
    const page = await newPage(browser, { lang: 'de' });
    await startGroup(page, MEDIO);
    await openHilfeCard(page);
    eq(await page.locator('.card-opts').count(), 0, 'closed at first');
    await page.click('[data-fid="aiuto"]');
    await page.waitForSelector('.card-opts');
    eq(await page.locator('.btn-aiuto').innerText(), TXT.nascondi.de, 'the pill became [nascondi]');
    eq(await page.locator('[data-fid="aiuto"]').count(), 0, 'no [aiuto] while the options are shown');
    assert(await page.evaluate(() => document.activeElement.dataset.fid === 'opt-0'), 'focus on the first option');
    const order = await optTexts(page);
    eq(order.length, 3);
    const fs0 = await page.locator('.card-front .card-prompt').evaluate(e => parseFloat(getComputedStyle(e).fontSize));
    await shot(page, 'players-06-hilfe-shown');
    // lock a pick (the second displayed option)
    await page.locator('.card-opt').nth(1).click();
    const glyphs = await page.locator('.card-opt .glyph').count();
    assert(glyphs >= 1, 'pick painted');
    // hide
    await page.click('[data-fid="nascondi"]');
    eq(await page.locator('.card-opts').count(), 0, 'options gone');
    eq(await page.locator('.btn-aiuto').innerText(), TXT.aiuto.de, 'the pill is [aiuto] again');
    assert(await page.evaluate(() => document.activeElement.dataset.fid === 'aiuto'), 'focus moves to the new pill');
    assert(await page.evaluate(() => window.__app.card.hilfe.hidden === true), 'card.hilfe.hidden = true');
    const fs1 = await page.locator('.card-front .card-prompt').evaluate(e => parseFloat(getComputedStyle(e).fontSize));
    assert(fs1 >= fs0, 'the card is re-fitted after hiding (' + fs0 + ' -> ' + fs1 + ')');
    eq(await page.locator('.card-body.fit-scroll').count(), 0, 'no scroll fallback');
    await shot(page, 'players-07-hilfe-hidden');
    // show again
    await page.click('[data-fid="aiuto"]');
    await page.waitForSelector('.card-opts');
    eq((await optTexts(page)).join('|'), order.join('|'), 'same order');
    eq(await page.locator('.card-opt .glyph').count(), glyphs, 'the pick is still painted');
    eq(await page.locator('.card-opt[aria-disabled="true"]').count(), 3, 'locked');
    const picked = await page.evaluate(() => window.__app.card.hilfe.picked);
    await page.locator('.card-opt').nth(2).click({ force: true });   // aria-disabled: Playwright would wait for it otherwise
    eq(await page.evaluate(() => window.__app.card.hilfe.picked), picked, 'a locked answer cannot be changed');
    assert(await page.evaluate(() => window.__app.card.hilfe.hidden === false), 'hidden = false');
    // the back of the card still works with the options hidden
    await page.click('[data-fid="nascondi"]');
    await page.click('.btn-soluzione');
    await page.waitForSelector('.card-flip.flipped');
  });

  t.test('players U5: hidden state survives a language switch', async ({ browser }) => {
    const page = await newPage(browser, { lang: 'de' });
    await startGroup(page, MEDIO);
    await openHilfeCard(page);
    await page.click('[data-fid="aiuto"]');
    const order = await optTexts(page);
    await page.locator('.card-opt').nth(0).click();
    await page.click('[data-fid="nascondi"]');
    await page.click('[data-fid="lang-it"]');
    eq(await page.locator('.card-opts').count(), 0, 'still hidden after DE -> IT');
    eq(await page.locator('.btn-aiuto').innerText(), TXT.aiuto.it);
    await page.click('[data-fid="aiuto"]');
    eq((await optTexts(page)).join('|'), order.join('|'), 'same order after the switch');
    eq(await page.locator('.card-opt[aria-disabled="true"]').count(), 3, 'still locked');
    eq(await page.locator('.btn-aiuto').innerText(), TXT.nascondi.it);
    await page.click('[data-fid="lang-de"]');   // switching while shown keeps it shown
    eq(await page.locator('.card-opts').count(), 1);
    eq(await page.locator('.btn-aiuto').innerText(), TXT.nascondi.de);
  });

  t.test('players U5: hidden state survives a reload (saved as card.hilfe.hidden)', async ({ browser }) => {
    const page = await newPage(browser, { lang: 'de' });
    await startGroup(page, MEDIO);
    await openHilfeCard(page);
    await page.click('[data-fid="aiuto"]');
    const order = await optTexts(page);
    await page.locator('.card-opt').nth(2).click();
    await page.click('[data-fid="nascondi"]');
    const h = JSON.parse(await getSave(page)).card.hilfe;
    eq(h.hidden, true, 'saved hidden');
    eq(h.order.length, 3);
    assert(h.picked !== null, 'saved pick');
    await reloadResume(page);
    eq(await page.locator('.card-opts').count(), 0, 'still hidden after the reload');
    eq(await page.locator('.btn-aiuto').innerText(), TXT.aiuto.de);
    await page.click('[data-fid="aiuto"]');
    eq((await optTexts(page)).join('|'), order.join('|'), 'same order after the reload');
    eq(await page.locator('.card-opt[aria-disabled="true"]').count(), 3, 'locked after the reload');
    eq(JSON.parse(await getSave(page)).card.hilfe.hidden, false, 'saved shown again');
    await page.click('.btn-secondary');   // chiudi -> a new card has no Hilfe state
    await page.waitForSelector('.tiles');
    await openCategory(page, T_INDOVINA);
    eq(await page.locator('.card-opts').count(), 0, 'a new card starts with the options closed');
    eq(await page.locator('[data-fid="aiuto"]').count(), 1);
  });

  t.test('players U5: the preview "show Hilfe" toggle still works', async ({ browser }) => {
    const page = await newPage(browser, { lang: 'de', goto: false });
    await page.goto(page.fixtureBase + '?anteprima');
    await page.waitForSelector('.pv-title');
    eq(await page.locator('.card-opts').count(), 0, 'off by default');
    await page.click('[data-fid="pv-aiuto"]');
    assert(await page.locator('.card-opts').count() > 0, 'options shown');
    assert(await page.locator('.card-opts .card-opt').count() >= 3, '3 options per card');
    await page.click('[data-fid="pv-aiuto"]');
    eq(await page.locator('.card-opts').count(), 0, 'off again');
  });

  /* ------------------------------------------------------------------ saved game v2 */
  const setSave = async (page, obj) => {
    await page.evaluate(() => { window.__app.screen = 'start'; });   // so the page's own pagehide save does not overwrite it
    await page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, JSON.stringify(Object.assign({}, obj, { savedAt: Date.now() }))]);
  };
  for (const f of ['v1-group.json', 'v1-players.json']) {
    t.test('players save: an old v1 save (' + f + ') is discarded silently - no prompt, key removed, no crash', async ({ browser }) => {
      const page = await newPage(browser, { lang: 'de' });
      const v1 = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests', 'fixtures', 'saves', f), 'utf8'));
      eq(v1.v, 1, 'the fixture is a v1 save');
      await setSave(page, v1);
      assert(await getSave(page), 'the v1 save is in storage');
      await page.goto(page.fixtureBase);
      await page.waitForSelector('#app .start');
      eq(await page.locator('.backdrop').count(), 0, 'no prompt');
      eq(await getSave(page), null, 'key removed');
      eq(await page.evaluate(() => window.__app.screen), 'start');
      // and a fresh game works
      await startGroup(page, MEDIO);
      eq(JSON.parse(await getSave(page)).v, 2, 'the new save is v2');
    });
  }

  t.test('players save: v2 restore keeps the turn exactly (grid and open card), per-player levels and names', async ({ browser }) => {
    const page = await newPage(browser, { lang: 'de' });
    await startPlayers(page, ['Anna', 'Bruno', 'Chiara'], [FACILE, MEDIO, 2]);
    await openCategory(page, T_INDOVINA);
    await chiudi(page);   // Bruno's turn
    // Bruno's level changes in the popup, then he opens a card
    await page.click('.topfield-btn');
    await page.locator('.panel .btn-level').nth(2).click();
    await openCategory(page, T_INDOVINA);
    const before = { card: (await cardNow(page)).testo, top: await top(page), lv: (await levels(page)).join('|') };
    eq(before.lv, 'Facile|Difficile|Difficile');
    const s = JSON.parse(await getSave(page));
    eq(s.v, 2); eq(s.screen, 'carta'); eq(s.setup.attivo, 1);
    eq(JSON.stringify(Object.keys(s.card)), JSON.stringify(['sfida', 'id', 'hilfe']));
    await reloadResume(page);
    eq(await page.evaluate(() => window.__app.screen), 'carta');
    eq(await attivo(page), 1, 'the turn is restored');
    eq((await cardNow(page)).testo, before.card, 'same card');
    eq(await top(page), before.top, 'same top field');
    eq((await levels(page)).join('|'), before.lv, 'levels');
    await chiudi(page);
    eq(await attivo(page), 2, '[chiudi] after the restore passes the turn');
    // on the grid
    await reloadResume(page);
    eq(await page.evaluate(() => window.__app.screen), 'gioco');
    eq(await attivo(page), 2);
    eq(await top(page), 'Am Zug: Chiara – ' + lvName(2, 'de'));
  });

  t.test('players save: a missing player level -> giocatori with that field empty; attivo clamped', async ({ browser }) => {
    const page = await newPage(browser, { lang: 'de' });
    await startPlayers(page, ['Anna', 'Bruno'], [FACILE, MEDIO]);
    await page.evaluate(k => {
      window.__app.screen = 'start';
      const s = JSON.parse(localStorage.getItem(k));
      s.setup.giocatori[1].livello = 'NonEsiste';
      s.setup.attivo = 9;
      localStorage.setItem(k, JSON.stringify(s));
    }, KEY);
    await reloadResume(page);
    eq(await page.evaluate(() => window.__app.screen), 'giocatori');
    eq((await page.locator('.level-field').evaluateAll(a => a.map(b => b.classList.contains('empty')))).join(','), 'false,true');
    eq(await page.evaluate(() => window.__app.setup.attivo), 1, 'attivo clamped to the last player');
    assert(await page.locator('.btn-start').isDisabled(), 'inizia disabled');
  });

  /* ------------------------------------------------------------------ J-4 / J-5 / J-9 */
  t.test('players J-4: hyphens: auto only on the .fit-break card text', async ({ browser }) => {
    const page = await newPage(browser, { lang: 'de' });
    await startGroup(page, MEDIO);
    await openCategory(page, T_INDOVINA);
    const r = await page.evaluate(() => {
      const face = document.querySelector('.card-front'), p = face.querySelector('.card-prompt');
      const h = () => { const cs = getComputedStyle(p); return cs.hyphens || cs.webkitHyphens; };
      const normal = h();
      face.classList.add('fit-break');
      const broken = h();
      face.classList.remove('fit-break');
      return { normal, broken };
    });
    eq(r.normal, 'manual', 'normal text is not hyphenated (fitting shrinks first)');
    eq(r.broken, 'auto', 'fit-break text is hyphenated');
  });

  t.test('players J-5: a failing save adds exactly ONE err_salvataggio line, once per session, no console errors', async ({ browser }) => {
    const page = await newPage(browser, { lang: 'de', goto: false });
    await page.addInitScript(() => { Storage.prototype.setItem = () => { throw new DOMException('blocked', 'SecurityError'); }; });
    await page.goto(page.fixtureBase);
    await page.waitForSelector('#app .start');
    const lines = async () => (await page.locator('#banner li').allTextContents()).filter(x => x.includes(TXT.err_salvataggio.de) || x.includes(TXT.err_salvataggio.it));
    eq((await lines()).length, 0, 'nothing before the first save attempt');
    await startGroup(page, MEDIO, 2);   // many save attempts
    await openCategory(page, T_INDOVINA);
    await page.click('[data-fid="aiuto"]');
    await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
    const l = await lines();
    eq(l.length, 1, 'exactly one banner line: ' + JSON.stringify(l));
    assert(l[0].startsWith('localStorage'), 'file label: ' + l[0]);
    eq(await page.evaluate(() => window.__app.problems.filter(p => p.key === 'err_salvataggio').length), 1, 'one problem entry');
    await page.click('[data-fid="lang-it"]');
    await chiudi(page);
    const l2 = await lines();
    eq(l2.length, 1, 'still one after more saves and a language switch');
    assert(l2[0].includes(TXT.err_salvataggio.it), 'translated: ' + l2[0]);
    eq(await page.evaluate(() => document.getElementById('banner').hidden), false, 'banner visible');
    await shot(page, 'players-08-banner-save-failed');
  });

  t.test('players J-5: with working storage there is no err_salvataggio', async ({ browser }) => {
    const page = await newPage(browser, { lang: 'de' });
    await startGroup(page, MEDIO);
    eq(await page.evaluate(() => window.__app.problems.filter(p => p.key === 'err_salvataggio').length), 0);
  });

  t.test('players J-9: the invalid value is in the err_posizione / err_icona_dimensione / err_margine messages (DE + IT)', async ({ browser }) => {
    for (const lang of ['de', 'it']) {
      const page = await newPage(browser, { lang, fixture: 'layout2a', goto: true });
      const lines = await page.locator('#banner li').allTextContents();
      eq(lines.length, 4, 'banner lines');
      assert(lines[0].includes("'sopra'"), lang + ' err_posizione: ' + lines[0]);
      assert(lines[1].includes("'grande'"), lang + ' err_icona_dimensione: ' + lines[1]);
      assert(lines[2].includes('testo_margine_alto = 50'), lang + ' err_margine (range): ' + lines[2]);
      assert(lines[3].includes('testo_margine_alto = 40') && lines[3].includes('testo_margine_basso = 45'), lang + ' err_margine (sum): ' + lines[3]);
      assert(!/\{\w+\}/.test(lines.join(' ')), 'no unfilled placeholder: ' + lines.join(' | '));
    }
  });
}
