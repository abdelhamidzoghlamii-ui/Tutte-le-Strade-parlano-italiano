// U4: [impostazioni] mid-game = edit the players (draft, [salva] / [annulla], [nuova_partita] with confirmation).
// U6: Android / browser Back (history entries per layer, popstate decided from the current app state).
import fs from 'node:fs';
import path from 'node:path';
import {
  ROOT, newPage, startPlayers, openCategory, shot, assert, eq
} from '../lib.mjs';

const KEY = 'tlspi-partita';
const FACILE = 0, MEDIO = 1, DIFFICILE = 2;
const T_INDOVINA = 3;   // tile index in data/sfide.csv (cards at every level)

// UI texts read from the CSV (never hardcoded here)
const csv = f => fs.readFileSync(path.join(ROOT, 'data', f), 'utf8').replace(/^﻿/, '').split(/\r?\n/).slice(1).map(l => l.split(';')).filter(r => r[0]);
const TXT = {};
csv('testi_ui.csv').forEach(([k, de, it]) => { TXT[k] = { de, it }; });

const app = (page, fn, arg) => page.evaluate(fn, arg);
const setup = page => page.evaluate(() => JSON.parse(JSON.stringify(window.__app.setup)));
const attivo = page => page.evaluate(() => window.__app.setup.attivo);
const screen = page => page.evaluate(() => window.__app.screen);
const getSave = page => page.evaluate(k => localStorage.getItem(k), KEY);
const names = async page => (await setup(page)).giocatori.map(p => p.nome);
const lvls = async page => (await setup(page)).giocatori.map(p => p.livello);
const pools = page => page.evaluate(() => JSON.stringify([window.__app.pools, window.__app.last]));
const bottom = (page, n) => page.locator('.pair.bottom .btn').nth(n);
const noDialog = page => page.waitForFunction(() => !document.querySelector('.backdrop'));
const dlg = (page, name) => page.waitForSelector('.backdrop[data-dlg="' + name + '"]');
// number of history entries of the app above its foundation entry (history.state.depth, 0 = none)
const depth = page => page.evaluate(() => (history.state && history.state.depth) || 0);
const depthIs = (page, n) => page.waitForFunction(n => ((history.state && history.state.depth) || 0) === n, n);

async function openEdit(page) {
  await page.click('[data-fid="impostazioni"]');
  await page.waitForSelector('.prow.edit');
}
const rowCount = page => page.locator('.prow.edit').count();
const draftLevels = page => page.evaluate(() => window.__app.edit.giocatori.map(p => p.livello));
async function setDraftLevel(page, row, lv) {
  await page.locator('.prow.edit .level-field').nth(row).click();
  await page.locator('.panel .btn-level').nth(lv).click();
  await noDialog(page);
}
async function setActive(page, i) {
  await page.click('.topfield-btn');
  await page.locator('.panel .btn-player').nth(i).click();
  await noDialog(page);
  eq(await attivo(page), i, 'setActive');
}
async function reloadResume(page) {
  await page.goto(page.fixtureBase);
  await page.waitForSelector('#app .start');
  await page.locator('.backdrop[data-dlg="riprendi"] .btn-yes').click();
  await page.waitForFunction(() => !document.querySelector('.backdrop'));
}
// Anna (Facile), Bruno (Medio), Chiara (Difficile) on the grid
async function three(page) {
  await startPlayers(page, ['Anna', 'Bruno', 'Chiara'], [FACILE, MEDIO, DIFFICILE]);
}
const J = a => a.join('|');

export default function (t) {
  /* ------------------------------------------------------------------ U4 */
  t.test('edit-back U4: screen = title, one row per player (name, level, [rimuovi]), add / save / cancel / new game; DE + IT', async ({ browser }) => {
    const page = await newPage(browser, { lang: 'de' });
    await three(page);
    await openEdit(page);
    eq(await screen(page), 'modifica');
    eq(await page.locator('.question').innerText(), TXT.modifica_titolo.de);
    eq(await rowCount(page), 3);
    eq(J(await page.locator('.prow.edit .name-input').evaluateAll(a => a.map(e => e.value))), 'Anna|Bruno|Chiara', 'names prefilled');
    eq(J(await page.locator('.prow.edit .level-field').allInnerTexts()), 'Anfänger|Mittel|Fortgeschritten', 'levels');
    eq(J(await page.locator('.prow.edit .btn-remove').allInnerTexts()), J([1, 2, 3].map(() => TXT.rimuovi.de)));
    eq(await page.locator('[data-fid="aggiungi"]').innerText(), TXT.aggiungi_giocatore.de);
    eq(await page.locator('[data-fid="salva"]').innerText(), TXT.salva.de);
    eq(await page.locator('[data-fid="annulla-edit"]').innerText(), TXT.annulla.de);
    eq(await page.locator('[data-fid="nuova"]').innerText(), TXT.nuova_partita.de);
    assert((await page.locator('[data-fid="nuova"]').getAttribute('class')).includes('btn-secondary'), 'new game is a secondary button');
    await shot(page, 'edit-01-modifica-de');
    await page.click('[data-fid="lang-it"]');
    eq(await page.locator('.question').innerText(), TXT.modifica_titolo.it);
    eq(await page.locator('[data-fid="salva"]').innerText(), TXT.salva.it);
    eq(await page.locator('[data-fid="aggiungi"]').innerText(), TXT.aggiungi_giocatore.it);
    eq(await page.locator('.prow.edit .btn-remove').first().innerText(), TXT.rimuovi.it);
    eq(await page.locator('.prow.edit .name-input').nth(0).getAttribute('placeholder'), 'Giocatore 1');
    await shot(page, 'edit-02-modifica-it');
    // no horizontal overflow at phone width
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'no horizontal scroll');
  });

  t.test('edit-back U4: [rimuovi] disabled with one player left; [aggiungi] hidden at the maximum; a new player gets the current level', async ({ browser }) => {
    const page = await newPage(browser, { lang: 'de' });
    await startPlayers(page, ['Anna', 'Bruno'], [DIFFICILE, MEDIO]);
    await openEdit(page);
    await page.locator('.prow.edit .btn-remove').nth(1).click();
    eq(await rowCount(page), 1);
    assert(await page.locator('.prow.edit .btn-remove').isDisabled(), 'last player cannot be removed');
    // add up to the maximum: every new player gets the active player's level (Anna, Difficile)
    const max = await app(page, () => CONFIG.maxGiocatori);
    for (let n = 1; n < max; n++) await page.click('[data-fid="aggiungi"]');
    eq(await rowCount(page), max);
    eq(await page.locator('[data-fid="aggiungi"]').count(), 0, 'add hidden at the maximum');
    eq(J(await draftLevels(page)), J(new Array(max).fill('Difficile')), 'new players = current level');
    assert(await page.locator('.prow.edit .btn-remove').first().isEnabled(), 'remove enabled again');
    await page.locator('.prow.edit .btn-remove').nth(max - 1).click();
    eq(await page.locator('[data-fid="aggiungi"]').count(), 1, 'add back after a removal');
    eq(await page.locator('.prow.edit .name-input').last().getAttribute('placeholder'), 'Spieler ' + (max - 1));
    await shot(page, 'edit-03-modifica-many');
  });

  t.test('edit-back U4: rename, change a level, add, remove -> [salva] shows it on the grid', async ({ browser }) => {
    const page = await newPage(browser, { lang: 'de' });
    await three(page);
    await openEdit(page);
    await page.locator('.prow.edit .name-input').nth(0).fill('Anni');
    await setDraftLevel(page, 1, FACILE);
    await page.locator('.prow.edit .btn-remove').nth(2).click();      // Chiara goes
    await page.click('[data-fid="aggiungi"]');                          // new player (level of the active one = Anna, Facile)
    await page.locator('.prow.edit .name-input').nth(2).fill('Dario');
    await setDraftLevel(page, 2, DIFFICILE);
    // nothing changed before [salva]
    eq(J(await names(page)), 'Anna|Bruno|Chiara', 'draft: setup untouched');
    await page.click('[data-fid="salva"]');
    await page.waitForSelector('.tiles');
    eq(await screen(page), 'gioco');
    eq(J(await names(page)), 'Anni|Bruno|Dario');
    eq(J(await lvls(page)), 'Facile|Facile|Difficile');
    eq(await page.locator('.topfield').innerText(), TXT.tocca_a.de + ' Anni – Anfänger', 'grid shows the active player');
    await page.click('.topfield-btn');
    eq(J(await page.locator('.panel .btn-player').allInnerTexts()), J(['Anni – Anfänger', 'Bruno – Anfänger', 'Dario – Fortgeschritten']));
    await shot(page, 'edit-04-popup-after-save');
  });

  t.test('edit-back U4: the turn stays with the active player, or goes to the next one of the OLD order when they are removed', async ({ browser }) => {
    const page = await newPage(browser, { lang: 'de' });
    await three(page);
    const remove = async idxs => {
      await openEdit(page);
      for (const i of idxs.slice().sort((a, b) => b - a)) await page.locator('.prow.edit .btn-remove').nth(i).click();
      await page.click('[data-fid="salva"]');
      await page.waitForSelector('.tiles');
    };
    // active Bruno (1), Anna removed: Bruno stays active, now at index 0
    await setActive(page, 1);
    await remove([0]);
    eq(J(await names(page)), 'Bruno|Chiara'); eq(await attivo(page), 0, 'active kept (index shifted)');
    // fresh: active Bruno removed -> Chiara (next in the old order)
    await page.evaluate(() => { const s = window.__app.setup; s.giocatori = [{ nome: 'Anna', livello: 'Facile' }, { nome: 'Bruno', livello: 'Medio' }, { nome: 'Chiara', livello: 'Difficile' }]; s.attivo = 1; render(); });
    await remove([1]);
    eq(J(await names(page)), 'Anna|Chiara'); eq(await attivo(page), 1, 'active removed: Chiara (next)');
    // active = last (Chiara) removed -> wraps to Anna
    await page.evaluate(() => { const s = window.__app.setup; s.giocatori = [{ nome: 'Anna', livello: 'Facile' }, { nome: 'Bruno', livello: 'Medio' }, { nome: 'Chiara', livello: 'Difficile' }]; s.attivo = 2; render(); });
    await remove([2]);
    eq(J(await names(page)), 'Anna|Bruno'); eq(await attivo(page), 0, 'wraps to the first');
    // active and the next one removed -> the one after that
    await page.evaluate(() => { const s = window.__app.setup; s.giocatori = [{ nome: 'Anna', livello: 'Facile' }, { nome: 'Bruno', livello: 'Medio' }, { nome: 'Chiara', livello: 'Difficile' }, { nome: 'Dario', livello: 'Medio' }]; s.attivo = 1; render(); });
    await remove([1, 2]);
    eq(J(await names(page)), 'Anna|Dario'); eq(await attivo(page), 1, 'Dario (next surviving in the old order)');
    // everybody replaced -> first player of the new list
    await openEdit(page);
    await page.click('[data-fid="aggiungi"]');
    await page.locator('.prow.edit .btn-remove').nth(1).click();
    await page.locator('.prow.edit .btn-remove').nth(0).click();
    await page.click('[data-fid="salva"]');
    await page.waitForSelector('.tiles');
    eq(await attivo(page), 0, 'all replaced: first player');
    eq(await names(page).then(a => a.length), 1);
  });

  t.test('edit-back U4: no-repeat pools and the last card survive [salva]; no repeat afterwards', async ({ browser }) => {
    const page = await newPage(browser, { lang: 'de' });
    await startPlayers(page, ['Anna', 'Bruno'], [MEDIO, MEDIO]);
    for (let i = 0; i < 2; i++) {   // one card per player in INDOVINA|Medio
      await openCategory(page, T_INDOVINA);
      await bottom(page, 0).click();
      await page.waitForSelector('.tiles');
    }
    const before = await pools(page);
    assert(JSON.parse(before)[0]['INDOVINA|Medio'] || Object.keys(JSON.parse(before)[0]).length, 'a pool exists');
    await openEdit(page);
    await page.locator('.prow.edit .name-input').nth(0).fill('Anni');
    await setDraftLevel(page, 1, FACILE);
    await page.click('[data-fid="aggiungi"]');
    await page.click('[data-fid="salva"]');
    await page.waitForSelector('.tiles');
    eq(await pools(page), before, 'pools and last cards identical after [salva]');
    // Anni (Medio) draws again: not the card drawn right before
    const lastKey = await app(page, () => { const s = window.__app; return s.sfide[3].sfida + '|' + s.setup.giocatori[s.setup.attivo].livello; });
    const prev = await app(page, k => window.__app.last[k], lastKey);
    await openCategory(page, T_INDOVINA);
    const now = await app(page, () => window.__app.card.idx);
    assert(prev === undefined || now !== prev, 'no immediate repeat after [salva]');
    // [annulla] keeps them too
    await bottom(page, 0).click();
    await page.waitForSelector('.tiles');
    const b2 = await pools(page);
    await openEdit(page);
    await page.click('[data-fid="annulla-edit"]');
    await page.waitForSelector('.tiles');
    eq(await pools(page), b2, 'pools unchanged after [annulla]');
  });

  t.test('edit-back U4: [annulla] discards the draft and returns to the unchanged grid', async ({ browser }) => {
    const page = await newPage(browser, { lang: 'de' });
    await three(page);
    await setActive(page, 2);
    const before = JSON.stringify(await setup(page));
    await openEdit(page);
    await page.locator('.prow.edit .name-input').nth(0).fill('Zorro');
    await setDraftLevel(page, 1, DIFFICILE);
    await page.locator('.prow.edit .btn-remove').nth(2).click();
    await page.click('[data-fid="aggiungi"]');
    await page.click('[data-fid="annulla-edit"]');
    await page.waitForSelector('.tiles');
    eq(await screen(page), 'gioco');
    eq(JSON.stringify(await setup(page)), before, 'setup identical');
    eq(await app(page, () => window.__app.edit), null, 'draft dropped');
    // opening again starts from the saved players, not the old draft
    await openEdit(page);
    eq(J(await page.locator('.prow.edit .name-input').evaluateAll(a => a.map(e => e.value))), 'Anna|Bruno|Chiara');
  });

  t.test('edit-back U4: [salva] is disabled while a player has no level', async ({ browser }) => {
    const page = await newPage(browser, { lang: 'de' });
    await three(page);
    await openEdit(page);
    assert(await page.locator('[data-fid="salva"]').isEnabled(), 'enabled at first');
    await page.evaluate(() => { window.__app.edit.giocatori[1].livello = null; render(); });
    assert(await page.locator('[data-fid="salva"]').isDisabled(), 'disabled without a level');
    eq(await page.locator('.prow.edit .level-field.empty').count(), 1);
    await setDraftLevel(page, 1, MEDIO);
    assert(await page.locator('[data-fid="salva"]').isEnabled(), 'enabled again');
  });

  t.test('edit-back U4: reload after [salva] restores the edited players and the turn; a reload on "modifica" restores the last SAVED players', async ({ browser }) => {
    const page = await newPage(browser, { lang: 'de' });
    await three(page);
    await setActive(page, 1);
    await openEdit(page);
    await page.locator('.prow.edit .btn-remove').nth(0).click();                 // Anna goes, Bruno stays active (index 0)
    await page.locator('.prow.edit .name-input').nth(1).fill('Chiara2');
    await page.click('[data-fid="aggiungi"]');
    await page.click('[data-fid="salva"]');
    await page.waitForSelector('.tiles');
    const saved = JSON.parse(await getSave(page));
    eq(saved.screen, 'gioco');
    eq(J(saved.setup.giocatori.map(p => p.nome)), 'Bruno|Chiara2|');
    await reloadResume(page);
    eq(await screen(page), 'gioco');
    eq(J(await names(page)), 'Bruno|Chiara2|');
    eq(await attivo(page), 0, 'turn restored');
    eq(await page.locator('.topfield').innerText(), TXT.tocca_a.de + ' Bruno – Mittel');
    // reload while editing: the draft is lost, the saved players come back, on the grid
    await openEdit(page);
    await page.locator('.prow.edit .name-input').nth(0).fill('Draft');
    await page.click('[data-fid="aggiungi"]');
    const mid = JSON.parse(await getSave(page));
    eq(mid.screen, 'gioco', '"modifica" is saved as the grid');
    eq(J(mid.setup.giocatori.map(p => p.nome)), 'Bruno|Chiara2|', 'the draft is not saved');
    await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
    eq(J(JSON.parse(await getSave(page)).setup.giocatori.map(p => p.nome)), 'Bruno|Chiara2|', 'not even on pagehide');
    await reloadResume(page);
    await page.waitForSelector('.tiles');
    eq(await screen(page), 'gioco');
    eq(J(await names(page)), 'Bruno|Chiara2|');
    eq(await app(page, () => window.__app.edit), null);
  });

  t.test('edit-back U4: [nuova_partita] -> confirm dialog; [annulla] stays, [si] starts a fresh setup and clears the save', async ({ browser }) => {
    const page = await newPage(browser, { lang: 'de' });
    await three(page);
    await openEdit(page);
    await page.click('[data-fid="nuova"]');
    await dlg(page, 'nuova');
    eq(await page.locator('.backdrop h2').innerText(), TXT.conferma_nuova.de);
    eq(await page.locator('.backdrop .btn-yes').innerText(), TXT.si.de);
    eq(await page.locator('.backdrop .btn-cancel').innerText(), TXT.annulla.de);
    await shot(page, 'edit-05-confirm-nuova');
    await page.click('.backdrop .btn-cancel');
    await noDialog(page);
    eq(await screen(page), 'modifica', '[annulla] keeps the edit screen');
    assert(await getSave(page), 'save kept');
    await page.click('[data-fid="lang-it"]');
    await page.click('[data-fid="nuova"]');
    eq(await page.locator('.backdrop h2').innerText(), TXT.conferma_nuova.it);
    await page.click('.backdrop .btn-yes');
    await page.waitForSelector('.question');
    eq(await screen(page), 'stesso');
    eq(await getSave(page), null, 'save cleared');
    const s = await setup(page);
    eq(JSON.stringify(s), JSON.stringify({ stesso: null, livello: null, giocatori: [{ nome: '', livello: null }], attivo: 0 }), 'fresh setup');
    eq(await app(page, () => window.__app.edit), null);
  });

  /* ------------------------------------------------------------------ U6 */
  t.test('edit-back U6: start screen and setup screens add no history entries; Back on the start screen leaves the site', async ({ browser }) => {
    const page = await newPage(browser, { goto: false });
    await page.goto('about:blank');
    await page.goto(page.fixtureBase);
    await page.waitForSelector('#app .start');
    const len = await page.evaluate(() => history.length);
    eq(await page.evaluate(() => history.state), null, 'untouched state');
    await page.click('.start .btn');
    await page.click('.btn-no');
    await page.locator('.btn-num').nth(1).click();
    await page.waitForSelector('.name-input');
    await page.locator('.level-field').nth(0).click();     // a popup on a setup screen is a layer
    await dlg(page, 'popup');
    eq(await page.evaluate(() => history.length), len + 1, 'only the popup pushed an entry');
    await page.goBack();
    await noDialog(page);
    eq(await screen(page), 'giocatori', 'Back closed the popup');
    eq(await page.evaluate(() => history.length), len + 1, 'Back moves inside the stack, nothing is added');
    // nothing special on setup screens: Back leaves for about:blank
    await page.goBack();
    await page.waitForFunction(() => location.href === 'about:blank');
  });

  t.test('edit-back U6: popup open + Back -> popup closed, still on the grid (also the player popup of the top field)', async ({ browser }) => {
    const page = await newPage(browser, { lang: 'de' });
    await three(page);
    eq(await depth(page), 1, 'base entry');
    await page.click('.topfield-btn');
    await dlg(page, 'giocatore');
    eq(await depth(page), 2, 'popup entry');
    await page.goBack();
    await noDialog(page);
    await page.waitForSelector('.tiles');
    eq(await screen(page), 'gioco');
    eq(await depth(page), 1);
    // a popup closed with its own button leaves no entry behind
    await page.click('.topfield-btn');
    await page.click('.panel .btn-cancel');
    await noDialog(page);
    await depthIs(page, 1);
    // level popup inside the top-field dialog flow
    await page.click('.topfield-btn');
    await page.locator('.panel .btn-level').nth(DIFFICILE).click();
    await noDialog(page);
    await depthIs(page, 1);
    eq((await lvls(page))[0], 'Difficile');
  });

  t.test('edit-back U6: card open + Back -> grid, and the turn advanced (= [chiudi])', async ({ browser }) => {
    const page = await newPage(browser, { lang: 'de' });
    await three(page);
    await openCategory(page, T_INDOVINA);
    eq(await depth(page), 2, 'card entry');
    eq(await attivo(page), 0);
    await page.goBack();
    await page.waitForSelector('.tiles');
    eq(await screen(page), 'gioco');
    eq(await attivo(page), 1, 'turn passed');
    eq(await depth(page), 1);
    assert(await page.locator('.backdrop').count() === 0, 'no dialog');
    // [altra_carta] adds no entry
    await openCategory(page, T_INDOVINA);
    await bottom(page, 1).click();
    await page.waitForTimeout(450);
    eq(await depth(page), 2, '[altra_carta] pushes nothing');
    await page.goBack();
    await page.waitForSelector('.tiles');
    eq(await attivo(page), 2);
  });

  t.test('edit-back U6: grid + Back -> exit dialog; [annulla] stays on the grid; Back again -> the dialog closes', async ({ browser }) => {
    const page = await newPage(browser, { lang: 'de' });
    await three(page);
    await page.goBack();
    await dlg(page, 'esci');
    eq(await page.locator('.backdrop h2').innerText(), TXT.conferma_esci.de);
    eq(await screen(page), 'gioco');
    eq(await depth(page), 2, 'base + dialog');
    await shot(page, 'back-01-exit-dialog');
    await page.click('.backdrop .btn-cancel');
    await noDialog(page);
    eq(await screen(page), 'gioco', '[annulla] -> still on the grid');
    await depthIs(page, 1);
    await page.waitForSelector('.tiles');
    // grid + Back + Back
    await page.goBack();
    await dlg(page, 'esci');
    await page.goBack();
    await noDialog(page);
    eq(await screen(page), 'gioco', 'second Back closes the dialog');
    await depthIs(page, 1);
    // ... and a third Back asks again (never leaves, never loops)
    await page.goBack();
    await dlg(page, 'esci');
    // [si] leaves the game: start screen, no dangling entries
    await page.click('.backdrop .btn-yes');
    await page.waitForSelector('.start');
    await depthIs(page, 0);
    eq(await getSave(page), null);
  });

  t.test('edit-back U6: card closed with [chiudi], then Back -> exit dialog, NOT a second turn advance', async ({ browser }) => {
    const page = await newPage(browser, { lang: 'de' });
    await three(page);
    await openCategory(page, T_INDOVINA);
    await bottom(page, 0).click();   // chiudi
    await page.waitForSelector('.tiles');
    eq(await attivo(page), 1);
    await depthIs(page, 1);          // the card's entry is gone
    await page.goBack();
    await dlg(page, 'esci');
    eq(await attivo(page), 1, 'turn not advanced again');
    eq(await screen(page), 'gioco');
    await page.click('.backdrop .btn-cancel');
    await noDialog(page);
    eq(await attivo(page), 1);
  });

  t.test('edit-back U6: modifica + Back -> grid, edits discarded; Back with a popup open closes the popup first', async ({ browser }) => {
    const page = await newPage(browser, { lang: 'de' });
    await three(page);
    const before = JSON.stringify(await setup(page));
    await openEdit(page);
    eq(await depth(page), 2, 'edit entry');
    await page.locator('.prow.edit .name-input').nth(0).fill('Zorro');
    await page.locator('.prow.edit .btn-remove').nth(2).click();
    // level popup inside the edit screen
    await page.locator('.prow.edit .level-field').nth(0).click();
    await dlg(page, 'popup');
    eq(await depth(page), 3);
    await page.goBack();
    await noDialog(page);
    eq(await screen(page), 'modifica', 'popup closed, still editing');
    eq(await rowCount(page), 2, 'draft kept');
    // confirm dialog of [nuova_partita]
    await page.click('[data-fid="nuova"]');
    await dlg(page, 'nuova');
    await page.goBack();
    await noDialog(page);
    eq(await screen(page), 'modifica');
    await depthIs(page, 2);
    await page.goBack();
    await page.waitForSelector('.tiles');
    eq(await screen(page), 'gioco');
    eq(JSON.stringify(await setup(page)), before, 'edits discarded');
    eq(await app(page, () => window.__app.edit), null);
    await depthIs(page, 1);
    // [salva] / [annulla] with their buttons leave nothing behind either
    await openEdit(page);
    await page.click('[data-fid="salva"]');
    await page.waitForSelector('.tiles');
    await depthIs(page, 1);
    await openEdit(page);
    await page.click('[data-fid="annulla-edit"]');
    await page.waitForSelector('.tiles');
    await depthIs(page, 1);
    await page.goBack();
    await dlg(page, 'esci');
  });

  t.test('edit-back U6: [nuova_partita] from the edit screen leaves no entries; Back after a reload + resume still works', async ({ browser }) => {
    const page = await newPage(browser, { lang: 'de' });
    await three(page);
    await openEdit(page);
    await page.click('[data-fid="nuova"]');
    await page.click('[data-fid="nuova-si"]');
    await page.waitForSelector('.question');
    await depthIs(page, 0);
    // a reload on a card: the resume dialog is not a layer, the restored card is
    await page.goto(page.fixtureBase);   // (the new game left no save: nothing to resume)
    await page.waitForSelector('#app .start');
    await three(page);
    await openCategory(page, T_INDOVINA);
    await reloadResume(page);
    eq(await screen(page), 'carta');
    eq(await depth(page), 2, 'card entry again after the resume');
    await page.goBack();
    await page.waitForSelector('.tiles');
    eq(await attivo(page), 1, 'Back on the restored card = [chiudi]');
    await page.goBack();
    await dlg(page, 'esci');
  });

  t.test('edit-back U6: the Italian/German toggle and the resume dialog are not layers', async ({ browser }) => {
    const page = await newPage(browser, { lang: 'de' });
    await three(page);
    await page.click('[data-fid="lang-it"]');
    eq(await depth(page), 1, 'language switch pushes nothing');
    await page.goto(page.fixtureBase);
    await page.waitForSelector('#app .start');
    await page.waitForSelector('.backdrop[data-dlg="riprendi"]');
    eq(await depth(page), 0, 'resume dialog: no entry (a stale entry of the old page load becomes the foundation)');
  });

  t.test('edit-back U6: the preview never touches the history', async ({ browser }) => {
    const page = await newPage(browser, { goto: false });
    await page.goto(page.fixtureBase + '?anteprima');
    await page.waitForSelector('.pv-grid');
    const len = await page.evaluate(() => history.length);
    await page.click('[data-fid="pv-aiuto"]');
    await page.click('[data-fid="pv-retro"]');
    await page.click('[data-fid="lang-it"]');
    eq(await page.evaluate(() => history.length), len, 'no entries');
    eq(await page.evaluate(() => history.state), null);
    eq(await screen(page), 'anteprima');
  });
}
