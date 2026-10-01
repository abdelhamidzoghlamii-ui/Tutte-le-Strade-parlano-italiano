// Phase 2B: the game survives a reload (localStorage key tlspi-partita). localStorage is per origin, so fixture paths
// (/fx/<name>/...) and the root share the save: that is how "the CSV changed between sessions" is simulated.
import fs from 'node:fs';
import path from 'node:path';
import {
  ROOT, config, newPage, startGroup, startPlayers, openCategory, drawUntil, assert, eq
} from '../lib.mjs';

const KEY = 'tlspi-partita';
const MEDIO = 1;
const T_NOCARD = 0, T_INDOVINA = 3, T_COSE = 5, T_QUIZ = 7;   // tile indexes in data/sfide.csv (PARLA DI TE has no Medio card)
const HOUR = 3600 * 1000;

// the UI texts the prompt must show (read from the CSV, never hardcoded)
const TXT = {};
fs.readFileSync(path.join(ROOT, 'data', 'testi_ui.csv'), 'utf8').replace(/^﻿/, '').split(/\r?\n/).slice(1).forEach(l => {
  const [k, de, it] = l.split(';');
  if (k) TXT[k] = { de, it };
});

/* ---- helpers ---- */
const getSave = page => page.evaluate(k => localStorage.getItem(k), KEY);
// the same save ignoring savedAt (every save, also the one on pagehide, refreshes it)
const noTime = raw => { try { const o = JSON.parse(raw); delete o.savedAt; return JSON.stringify(o); } catch (e) { return raw; } };
// Writing a doctored save: the page is first put on the 'start' screen, otherwise its own pagehide save (fired by the
// next navigation) would overwrite what the test wrote.
const freeze = page => page.evaluate(() => { window.__app.screen = 'start'; });
const rmSave = page => page.evaluate(k => localStorage.removeItem(k), KEY);
const setSave = async (page, raw) => {
  await freeze(page);
  await page.evaluate(([k, v]) => { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); }, [KEY, raw]);
};
// edit the saved JSON in the page: body is JS with the parsed save in `s`
const mutate = async (page, body) => {
  await freeze(page);
  await page.evaluate(([k, src]) => {
    const s = JSON.parse(localStorage.getItem(k));
    new Function('s', src)(s);
    localStorage.setItem(k, JSON.stringify(s));
  }, [KEY, body]);
};

async function reloadTo(page, base = page.fixtureBase) {
  await page.goto(base);
  await page.waitForSelector('#app .start');
}
const prompt = page => page.locator('.backdrop[data-dlg="riprendi"]');
const resume = async page => { await page.locator('.backdrop[data-dlg="riprendi"] .btn-yes').click(); await page.waitForFunction(() => !document.querySelector('.backdrop')); };
const bottom = (page, n) => page.locator('.pair.bottom .btn').nth(n);
const known = ['start', 'stesso', 'livello', 'quanti', 'giocatori', 'gioco', 'carta'];

async function expectPrompt(page, lang) {
  eq(await prompt(page).count(), 1, 'prompt shown');
  eq(await page.locator('.backdrop h2').innerText(), TXT.partita_in_corso[lang], 'prompt title');
  const btns = page.locator('.backdrop button');
  eq(await btns.count(), 2, 'prompt buttons');
  eq(await btns.nth(0).innerText(), TXT.continua[lang], 'continua');
  eq(await btns.nth(1).innerText(), TXT.nuova_partita[lang], 'nuova_partita');
  const a = await page.evaluate(() => {
    const p = document.querySelector('.backdrop .panel'), h = p.querySelector('h2');
    return {
      role: p.getAttribute('role'), modal: p.getAttribute('aria-modal'), labelled: p.getAttribute('aria-labelledby') === h.id,
      focusFirst: document.activeElement === p.querySelector('button'),
      inert: [...document.getElementById('app').children].filter(c => !c.classList.contains('backdrop')).every(c => c.inert)
    };
  });
  eq(a.role, 'dialog'); eq(a.modal, 'true'); assert(a.labelled, 'aria-labelledby'); assert(a.focusFirst, 'focus on the first button'); assert(a.inert, 'background inert');
}

const snap = page => page.evaluate(() => {
  const s = window.__app;
  const c = s.card && s.card.idx != null ? s.carte[s.card.idx] : null;
  const top = document.querySelector('.topfield');
  return {
    screen: s.screen, lang: s.lang, setup: JSON.stringify(s.setup), top: top ? top.textContent : null,
    names: [...document.querySelectorAll('.name-input')].map(i => i.value),
    card: s.card ? { sfida: s.card.sfida, testo: c ? c.testo : null, hilfe: JSON.stringify(s.card.hilfe) } : null,
    opts: [...document.querySelectorAll('.card-opt')].map(b => b.className + '|' + b.textContent),
    idx: s.card ? s.card.idx : null, flipped: s.card ? s.card.flipped : null,
    dlg: !!document.querySelector('.backdrop')
  };
});
const same = (a, b, what) => {
  const strip = x => { const y = Object.assign({}, x); delete y.idx; delete y.flipped; delete y.dlg; return JSON.stringify(y); };
  eq(strip(b), strip(a), what);
};

async function reach(page, mode) {   // to the category grid
  if (mode === 'group') { await startGroup(page, MEDIO); return; }
  await startPlayers(page, ['Anna', 'Bruno', 'Chiara'], [0, 1, 2]);
  await page.locator('.topfield-btn').click();
  await page.locator('.panel .btn-level').nth(1).click();   // active player = 2 (Medio)
  await page.waitForFunction(() => !document.querySelector('.backdrop'));
}

/* ---- reload on each screen, both modes ---- */
const SCREENS = ['stesso', 'livello', 'quanti', 'giocatori', 'gioco', 'popup', 'carta-front', 'carta-back', 'hilfe', 'hilfe-scelta', 'timer', 'nessuna-carta'];

async function toScreen(page, mode, name) {
  const settings = async () => { await bottom(page, 1).click(); await page.waitForSelector('.question'); };
  switch (name) {
    case 'stesso': await settings(); break;
    case 'livello': await settings(); await page.click('.btn-yes'); await page.waitForSelector('.btn-level'); break;
    case 'quanti': await settings(); await page.click('.btn-no'); await page.waitForSelector('.btn-num'); break;
    case 'giocatori':
      await settings(); await page.click('.btn-no'); await page.locator('.btn-num').nth(2).click();
      await page.waitForSelector('.name-input');
      for (let i = 0; i < 3; i++) await page.locator('.name-input').nth(i).fill('Gioc' + i + 'äö');
      break;
    case 'gioco': break;
    case 'popup': await page.locator('.topfield-btn').click(); await page.waitForSelector('.backdrop'); break;
    case 'carta-front': await openCategory(page, T_QUIZ); break;
    case 'carta-back': await openCategory(page, T_QUIZ); await page.click('.btn-soluzione'); await page.waitForSelector('.card-flip.flipped'); break;
    case 'hilfe': await openCategory(page, T_QUIZ); await page.click('.btn-aiuto'); await page.waitForSelector('.card-opts'); break;
    case 'hilfe-scelta':
      await openCategory(page, T_QUIZ); await page.click('.btn-aiuto'); await page.waitForSelector('.card-opts');
      await page.locator('.card-opt').nth(1).click(); await page.waitForSelector('.card-opt .glyph');
      break;
    case 'timer':
      await openCategory(page, T_COSE); await page.click('.btn-timer'); await page.waitForTimeout(700);
      assert(await page.evaluate(() => window.__app.card.fx.timer.startedAt != null), 'timer running before the reload');
      break;
    case 'nessuna-carta':
      await openCategory(page, T_NOCARD);
      eq(await page.evaluate(() => window.__app.card.idx), null, 'no-card face');
      break;
  }
}

export default function (t) {
  for (const mode of ['group', 'players']) {
    for (const name of SCREENS) {
      if (name === 'popup' && mode === 'group') continue;   // the player selector exists only in player mode
      t.test('persist: reload on ' + name + ' (' + mode + ') -> prompt -> continua', async ({ browser }) => {
        const lang0 = mode === 'group' ? 'de' : 'it', lang1 = mode === 'group' ? 'it' : 'de';   // the init script resets lang to lang0 on every load
        const page = await newPage(browser, { lang: lang0 });
        await reach(page, mode);
        await page.click('[data-fid="lang-' + lang1 + '"]');   // the save must carry the language
        await toScreen(page, mode, name);
        const before = await snap(page);
        const raw = await getSave(page);
        assert(raw, 'a save exists');
        await reloadTo(page);
        await expectPrompt(page, lang0);
        eq(noTime(await getSave(page)), noTime(raw), 'the start screen / prompt leave the save untouched');
        await resume(page);
        const after = await snap(page);
        same(before, after, 'restored state');
        eq(after.lang, lang1, 'language');
        eq(await page.evaluate(() => document.documentElement.lang), lang1, 'html lang');
        if (name === 'popup') { eq(before.dlg, true); eq(after.dlg, false, 'popup is not restored'); }
        if (mode === 'players') eq(JSON.parse(after.setup).attivo, 1, 'active player');
        if (name === 'carta-back') {
          eq(before.flipped, true);
          eq(after.flipped, false, 'a card reopens on its front');
          eq(await page.locator('.card-flip.flipped').count(), 0);
        }
        if (name === 'hilfe') assert(after.card.hilfe !== 'null' && after.opts.length === 3, 'Hilfe restored with 3 options');
        if (name === 'hilfe-scelta') {
          eq(await page.locator('.card-opt .glyph').count(), await page.evaluate(() => (window.__app.card.hilfe.picked === 0 ? 1 : 2)), 'check / cross shown');
          eq(await page.locator('.card-opt.right').count(), 1);
        }
        if (name === 'timer') {
          const r = await page.evaluate(() => ({ st: window.__app.card.fx.timer, disp: document.querySelector('.timer-display').textContent, btn: document.querySelector('.btn-timer').textContent }));
          eq(r.st.startedAt, null, 'timer not running'); eq(r.disp, '1:00', 'full time'); eq(r.btn, TXT.timer_avvia[lang1], 'start button');
        }
        if (name === 'nessuna-carta') {
          eq(after.screen, 'carta'); eq(after.idx, null, 'still the no-card face, nothing drawn');
          eq(await page.locator('.card-text').first().innerText(), TXT.nessuna_carta[lang1]);
        }
        if (name === 'giocatori') eq(await page.locator('.btn-start').isDisabled(), mode === 'group', 'inizia enabled only when every player has a level');
      });
    }
  }

  t.test('persist: the prompt is modal (Escape, backdrop and Tab do not leave it)', async ({ browser }) => {
    const page = await newPage(browser);
    await startGroup(page, MEDIO);
    await reloadTo(page);
    await page.keyboard.press('Escape');
    eq(await prompt(page).count(), 1, 'Escape does not close');
    await page.mouse.click(3, 3);
    eq(await prompt(page).count(), 1, 'backdrop click does not close');
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Tab');
      assert(await page.evaluate(() => !!document.activeElement.closest('.panel')), 'Tab stays inside');
    }
    await page.keyboard.press('Shift+Tab');
    assert(await page.evaluate(() => !!document.activeElement.closest('.panel')), 'Shift+Tab stays inside');
  });

  t.test('persist: save shape (one key, content-based card ids, no fx / flip / popup), lang key kept', async ({ browser }) => {
    const page = await newPage(browser, { lang: 'it' });
    await startGroup(page, MEDIO);
    await openCategory(page, T_QUIZ);
    await page.click('.btn-aiuto');
    const s = JSON.parse(await getSave(page));
    eq(s.v, 1); assert(Math.abs(Date.now() - s.savedAt) < 60000, 'savedAt'); eq(s.lang, 'it'); eq(s.screen, 'carta');
    eq(JSON.stringify(Object.keys(s.setup)), JSON.stringify(['stesso', 'livello', 'giocatori', 'attivo']));
    eq(s.setup.stesso, true); eq(s.setup.livello, 'Medio');
    assert(s.card && s.card.id.split('␟').length === 3 && s.card.id.startsWith('QUIZ DI CULTURA GENERALE␟'), 'card id: ' + (s.card && s.card.id));
    assert(s.card.hilfe && s.card.hilfe.order.length === 3 && s.card.hilfe.picked === null, 'hilfe');
    eq(s.last['QUIZ DI CULTURA GENERALE|Medio'], s.card.id);
    eq(JSON.stringify(s.pools['QUIZ DI CULTURA GENERALE|Medio']), '[]');
    const raw = await getSave(page);
    assert(!/flipped|"fx"|popup|dialog/.test(raw), 'nothing transient in the save');
    const keys = await page.evaluate(() => Object.keys(localStorage).sort());
    eq(keys.join(','), 'lang,' + KEY, 'localStorage keys');
  });

  t.test('persist: saves on name input, pagehide and visibilitychange (hidden)', async ({ browser }) => {
    const page = await newPage(browser);
    await page.click('.start .btn');
    await page.click('.btn-no');
    await page.locator('.btn-num').nth(1).click();
    await page.locator('.name-input').nth(0).fill('Zoë');
    eq(JSON.parse(await getSave(page)).setup.giocatori[0].nome, 'Zoë', 'name input saves');
    await rmSave(page);
    await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
    eq(JSON.parse(await getSave(page)).screen, 'giocatori', 'pagehide saves');
    await rmSave(page);
    await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { get: () => 'visible', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
    eq(await getSave(page), null, 'visible: no save');
    await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { get: () => 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
    eq(JSON.parse(await getSave(page)).screen, 'giocatori', 'hidden saves');
  });

  /* ---- no-repeat survives a reload ---- */
  t.test('persist: no-repeat across a reload (3 cards: draw 2, reload, continua, the 3rd comes next)', async ({ browser }) => {
    const page = await newPage(browser, { fixture: 'p-pool3' });
    await startGroup(page, MEDIO);
    const text = () => page.evaluate(() => { const s = window.__app; return s.carte[s.card.idx].testo; });
    await openCategory(page, T_NOCARD);
    const c1 = await text();
    await bottom(page, 1).click();   // altra carta
    await page.waitForFunction(t0 => { const s = window.__app; return s.carte[s.card.idx].testo !== t0; }, c1);
    const c2 = await text();
    await reloadTo(page);
    await resume(page);
    eq(await text(), c2, 'the open card comes back');
    await bottom(page, 1).click();
    await page.waitForFunction(t0 => { const s = window.__app; return s.carte[s.card.idx].testo !== t0; }, c2);
    const c3 = await text();
    eq(new Set([c1, c2, c3]).size, 3, 'three different cards: ' + [c1, c2, c3].join(' / '));
  });

  /* ---- clearing and expiry ---- */
  t.test('persist: [nuova_partita] in the prompt -> stesso, empty setup, save gone until the first change', async ({ browser }) => {
    const page = await newPage(browser);
    await startGroup(page, MEDIO);
    await reloadTo(page);
    await page.locator('.backdrop button').nth(1).click();
    await page.waitForSelector('.question');
    const r = await page.evaluate(() => ({ screen: window.__app.screen, setup: JSON.stringify(window.__app.setup) }));
    eq(r.screen, 'stesso');
    eq(r.setup, JSON.stringify({ stesso: null, livello: null, giocatori: [{ nome: '', livello: null }], attivo: 0 }));
    eq(await getSave(page), null, 'key absent right after');
    await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
    eq(await getSave(page), null, 'an untouched new game is not saved');
    await page.click('.btn-yes');
    eq(JSON.parse(await getSave(page)).screen, 'livello', 'saved again after the first choice');
  });

  t.test('persist: [nuova_partita] on the start screen clears the save', async ({ browser }) => {
    const page = await newPage(browser);
    await startGroup(page, MEDIO);
    await bottom(page, 0).click();   // esci
    await page.click('.backdrop .btn-yes');
    await page.waitForSelector('.start');
    eq(await getSave(page), null, 'confirmed exit removes the key');
    await reloadTo(page);
    eq(await prompt(page).count(), 0, 'no prompt after an exit');
    // a save made, then the start button pressed without the prompt (save written after the page load)
    await startGroup(page, MEDIO);
    assert(await getSave(page), 'save written');
    await bottom(page, 0).click();
    await page.locator('.backdrop .btn-cancel').click();   // annulla: the save stays
    assert(await getSave(page), 'cancelled exit keeps the save');
    await bottom(page, 0).click();
    await page.click('.backdrop .btn-yes');
    await page.waitForSelector('.start');
    await setSave(page, JSON.stringify({ v: 1, savedAt: Date.now(), lang: 'de', screen: 'stesso', setup: { stesso: null, livello: null, giocatori: [{ nome: '', livello: null }], attivo: 0 }, pools: {}, last: {}, card: null }));
    await page.click('.start .btn');
    eq(await getSave(page), null, '[nuova_partita] clears it');
  });

  t.test('persist: save older than 24 h is dropped, 23 h is kept', async ({ browser }) => {
    const page = await newPage(browser);
    await startGroup(page, MEDIO);
    await mutate(page, 's.savedAt = Date.now() - 23 * 3600 * 1000');
    await reloadTo(page);
    eq(await prompt(page).count(), 1, '23 h: prompt');
    await mutate(page, 's.savedAt = Date.now() - 25 * 3600 * 1000');
    await reloadTo(page);
    eq(await prompt(page).count(), 0, '25 h: no prompt');
    eq(await getSave(page), null, '25 h: key removed');
  });

  t.test('persist: save dated in the future is dropped (+2 min is tolerated)', async ({ browser }) => {
    const page = await newPage(browser);
    await startGroup(page, MEDIO);
    await mutate(page, 's.savedAt = Date.now() + 2 * 60 * 1000');
    await reloadTo(page);
    eq(await prompt(page).count(), 1, '+2 min: prompt');
    await mutate(page, 's.savedAt = Date.now() + 3600 * 1000');
    await reloadTo(page);
    eq(await prompt(page).count(), 0, '+1 h: no prompt');
    eq(await getSave(page), null, '+1 h: key removed');
  });

  /* ---- corrupt data ---- */
  const CORRUPT = [
    { name: 'garbage JSON', mode: 'group', raw: 'not json {{', prompt: false },
    { name: 'v: 2', mode: 'group', body: 's.v = 2', prompt: false },
    { name: 'savedAt missing', mode: 'group', body: 'delete s.savedAt', prompt: false },
    { name: "screen 'xyz'", mode: 'group', body: "s.screen = 'xyz'", prompt: false },
    { name: 'giocatori not an array', mode: 'group', body: "s.setup.giocatori = 'x'", prompt: null },
    { name: 'setup missing', mode: 'group', body: 'delete s.setup', prompt: null },
    { name: 'attivo 99', mode: 'players', body: 's.setup.attivo = 99', prompt: true, check: async page => { eq(await page.evaluate(() => window.__app.setup.attivo), 2, 'clamped'); eq(await page.evaluate(() => window.__app.screen), 'gioco'); } },
    { name: 'name of 100 chars', mode: 'players', body: "s.setup.giocatori[0].nome = 'x'.repeat(100)", prompt: true, check: async page => { eq(await page.evaluate(() => window.__app.setup.giocatori[0].nome.length), 40, 'name cut'); } },
    { name: 'unknown sfida in card', mode: 'group', card: true, body: "s.card.sfida = 'NON ESISTE'", prompt: true, check: async page => { eq(await page.evaluate(() => window.__app.screen), 'gioco'); } },
    { name: 'hilfe order [0,0,0]', mode: 'group', card: true, hilfe: true, body: 's.card.hilfe.order = [0, 0, 0]', prompt: true, check: async page => {
      eq(await page.evaluate(() => window.__app.screen), 'carta');
      eq(await page.evaluate(() => window.__app.card.hilfe), null);
      eq(await page.locator('.card-opts').count(), 0);
      eq(await page.locator('.btn-aiuto').count(), 1, 'Hilfe button is back');
    } },
    { name: 'hilfe picked 7', mode: 'group', card: true, hilfe: true, body: 's.card.hilfe.picked = 7', prompt: true, check: async page => { eq(await page.evaluate(() => window.__app.card.hilfe), null); } }
  ];
  for (const c of CORRUPT) {
    t.test('persist: corrupt save - ' + c.name + ' (no crash, no console error)', async ({ browser }) => {
      const page = await newPage(browser);
      await reach(page, c.mode);
      if (c.card) {
        await openCategory(page, T_QUIZ);
        if (c.hilfe) { await page.click('.btn-aiuto'); await page.waitForSelector('.card-opts'); }
      }
      if (c.raw != null) await setSave(page, c.raw); else await mutate(page, c.body);
      await reloadTo(page);
      const shown = (await prompt(page).count()) === 1;
      if (c.prompt === false) { assert(!shown, 'no prompt'); eq(await getSave(page), null, 'key removed'); }
      if (c.prompt === true) assert(shown, 'prompt');
      if (shown) await resume(page);
      const scr = await page.evaluate(() => window.__app.screen);
      assert(known.includes(scr), 'screen ' + scr);
      assert(await page.locator('#app .topbar').count() === 1, 'something rendered');
      if (c.check) await c.check(page);
      if (c.prompt === null && shown) { eq(scr, 'start', 'a broken save restarts clean'); eq(await getSave(page), null); }
    });
  }

  /* ---- storage blocked ---- */
  for (const only of [false, true]) {
    t.test('persist: storage ' + (only ? 'full (setItem throws)' : 'blocked (get/set/remove throw)') + ' -> full flow works, no prompt, no errors', async ({ browser }) => {
      const page = await newPage(browser, { goto: false });
      await page.addInitScript(onlySet => {
        const boom = () => { throw new DOMException('blocked', 'SecurityError'); };
        Storage.prototype.setItem = boom;
        if (!onlySet) { Storage.prototype.getItem = boom; Storage.prototype.removeItem = boom; }
      }, only);
      await page.goto(page.fixtureBase);
      await page.waitForSelector('#app .start');
      eq(await prompt(page).count(), 0, 'no prompt');
      assert(await page.evaluate(() => { try { localStorage.setItem('x', 'y'); return false; } catch (e) { return true; } }), 'the stub throws');
      await startGroup(page, MEDIO);
      await openCategory(page, T_QUIZ);
      await page.click('.btn-aiuto');
      await page.locator('.card-opt').first().click();
      await page.click('.btn-soluzione');
      await page.waitForSelector('.card-flip.flipped');
      await bottom(page, 0).click();   // chiudi
      await page.waitForSelector('.tiles');
      await page.click('[data-fid="lang-it"]');
      await bottom(page, 0).click();   // esci
      await page.click('.backdrop .btn-yes');
      await page.waitForSelector('.start');
    });
  }

  /* ---- csv changed between sessions: save on the root data, reload a fixture path ---- */
  const lupo = 'in bocca al lupo!', vita = 'fare una vita da cani';
  const pool = (page, key) => page.evaluate(k => { const s = window.__app; return (s.pools[k] || null) && s.pools[k].map(i => s.carte[i].testo); }, key);

  t.test('persist: csv changed - the open card removed -> gioco, and it is gone from the pools', async ({ browser }) => {
    const page = await newPage(browser);
    await startGroup(page, MEDIO);
    await drawUntil(page, T_INDOVINA, lupo);
    const before = JSON.stringify(await pool(page, 'INDOVINA IL MODO DI DIRE|Medio'));
    assert(before === '[]' || before === JSON.stringify([vita]), 'pool before: ' + before);   // [] when the other card was drawn just before
    await reloadTo(page, config.base + '/fx/p-sans-lupo/');
    await resume(page);
    eq(await page.evaluate(() => window.__app.screen), 'gioco');
    eq(JSON.stringify(await pool(page, 'INDOVINA IL MODO DI DIRE|Medio')), before, 'pool after');
    const all = await page.evaluate(lp => { const s = window.__app; return Object.values(s.pools).flat().concat(Object.values(s.last)).map(i => s.carte[i].testo).includes(lp); }, lupo);
    eq(all, false, 'the removed card is in no pool / last');
    await openCategory(page, T_INDOVINA);   // still playable
    eq(await page.evaluate(() => window.__app.carte[window.__app.card.idx].testo), vita);
  });

  t.test('persist: csv changed - the group level removed -> livello screen', async ({ browser }) => {
    const page = await newPage(browser);
    await startGroup(page, MEDIO);
    await openCategory(page, T_COSE);
    await reloadTo(page, config.base + '/fx/p-sans-medio/');
    await resume(page);
    const r = await page.evaluate(() => ({ screen: window.__app.screen, lv: window.__app.setup.livello, st: window.__app.setup.stesso }));
    eq(r.screen, 'livello'); eq(r.lv, null); eq(r.st, true);
    eq(await page.locator('.btn-level').count(), 2, 'Facile + Difficile left');
  });

  t.test('persist: csv changed - one player level removed -> giocatori, that field empty, inizia disabled', async ({ browser }) => {
    const page = await newPage(browser);
    await reach(page, 'players');
    await openCategory(page, T_COSE);
    await reloadTo(page, config.base + '/fx/p-sans-medio/');
    await resume(page);
    eq(await page.evaluate(() => window.__app.screen), 'giocatori');
    const f = page.locator('.level-field');
    eq(await f.count(), 3);
    const empty = await f.evaluateAll(a => a.map(b => b.classList.contains('empty')));
    eq(JSON.stringify(empty), JSON.stringify([false, true, false]), 'only player 2 (Medio) is empty');
    eq(JSON.stringify(await page.locator('.name-input').evaluateAll(a => a.map(i => i.value))), JSON.stringify(['Anna', 'Bruno', 'Chiara']), 'names kept');
    eq(await page.locator('.btn-start').isDisabled(), true, 'inizia disabled');
  });

  t.test('persist: csv changed - the open card category removed -> gioco', async ({ browser }) => {
    const page = await newPage(browser);
    await startGroup(page, MEDIO);
    await openCategory(page, T_COSE);
    await reloadTo(page, config.base + '/fx/p-sans-cosenomi/');
    await resume(page);
    eq(await page.evaluate(() => window.__app.screen), 'gioco');
    eq(await page.locator('.tile').count(), 7);
    assert(!(await pool(page, 'COSE-NOMI-CITTÀ|Medio')), 'its pool is dropped');
  });

  t.test('persist: csv changed - rows reordered -> the same card is restored (ids are content, not row numbers)', async ({ browser }) => {
    const page = await newPage(browser);
    await startGroup(page, MEDIO);
    await openCategory(page, T_INDOVINA);
    const b = await page.evaluate(() => { const s = window.__app; return { idx: s.card.idx, testo: s.carte[s.card.idx].testo }; });
    await reloadTo(page, config.base + '/fx/p-reorder/');
    await resume(page);
    const a = await page.evaluate(() => { const s = window.__app; return { screen: s.screen, idx: s.card.idx, testo: s.carte[s.card.idx].testo }; });
    eq(a.screen, 'carta'); eq(a.testo, b.testo, 'same card');
    assert(a.idx !== b.idx, 'row index changed (' + b.idx + ' -> ' + a.idx + ')');
  });

  /* ---- preview ---- */
  t.test('persist: ?anteprima leaves an existing save untouched (and the game still offers it)', async ({ browser }) => {
    const page = await newPage(browser);
    await startGroup(page, MEDIO);
    await openCategory(page, T_QUIZ);
    const raw = await getSave(page);
    await page.goto(page.fixtureBase + '?anteprima');
    await page.waitForSelector('.pv-title');
    eq(await prompt(page).count(), 0, 'no prompt in the preview');
    await page.click('.pv-btn');
    await page.click('[data-fid="lang-it"]');
    await page.evaluate(() => { window.dispatchEvent(new Event('pagehide')); });
    eq(noTime(await getSave(page)), noTime(raw), 'save unchanged');
    await reloadTo(page);
    eq(await prompt(page).count(), 1, 'the game still offers the save');
  });

  t.test('persist: ?anteprima without a save writes none', async ({ browser }) => {
    const page = await newPage(browser, { goto: false });
    await page.goto(page.fixtureBase + '?anteprima');
    await page.waitForSelector('.pv-title');
    await page.click('.pv-btn');
    await page.evaluate(() => { window.dispatchEvent(new Event('pagehide')); });
    eq(await getSave(page), null, 'no key');
  });
}
