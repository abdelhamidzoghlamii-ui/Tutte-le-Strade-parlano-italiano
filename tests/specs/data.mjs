// Data loading and validation: CSV variants, missing/empty files, optional columns, bad rows, banner, performance.
// Fixtures are real files in tests/fixtures/<name>/data/ (anything not overridden comes from the repo's data/).
import {
  newPage, load, startGroup, chooseNumber, openCategory, soft, assert, eq
} from '../lib.mjs';

const probs = page => page.evaluate(() => window.__app.problems.map(p => ({ file: p.file, riga: p.riga, key: p.key, valore: p.vars.valore ?? null, forse: p.vars.forse ?? null })));
const counts = page => page.evaluate(() => {
  const s = window.__app;
  return { sfide: s.sfide.length, livelli: s.livelli.length, carte: s.carte.length, testi: Object.keys(s.testi).length };
});
const sig = p => [p.file, p.riga, p.key, p.valore, p.forse].map(String).join(':');
const bannerHidden = page => page.evaluate(() => document.getElementById('banner').hidden);
const only = (list, file) => list.filter(p => p.file === file);

export default async function (t) {
  t.test('data comma-separated with BOM and CRLF (all 4 CSVs): same data as the repo, no banner', async ({ browser }) => {
    const base = await counts(await newPage(browser, { lang: 'it' }));
    const page = await newPage(browser, { lang: 'it', fixture: 'csvcomma' });
    eq(JSON.stringify(await counts(page)), JSON.stringify(base), 'same counts as the semicolon files');
    eq((await probs(page)).length, 0, 'problems');
    assert(await bannerHidden(page), 'banner must be hidden');
    // accents / umlauts survive: header BOM did not leak into the first column name, values intact
    const v = await page.evaluate(() => ({ si: window.__app.testi.si, lv: window.__app.livelli[0], first: window.__app.sfide[0].sfida, last: window.__app.sfide[5].sfida }));
    eq(v.si.it, 'Sì');
    eq(v.lv.nome_de, 'Anfänger');
    eq(v.last, 'COSE-NOMI-CITTÀ');
    eq(await page.locator('.start h1').textContent(), 'Tutte le strade... parlano italiano!');
    await startGroup(page, 0);
    eq(await page.locator('.tile').count(), base.sfide);
  });

  t.test('data Windows-1252 carte.csv: encoding warning, accents still render', async ({ browser }) => {
    const page = await newPage(browser, { lang: 'it', fixture: 'cp1252' });
    const p = await probs(page);
    eq(p.length, 1, 'exactly one problem: ' + JSON.stringify(p));
    eq(p[0].file, 'carte.csv');
    eq(p[0].key, 'err_codifica');
    assert(!(await bannerHidden(page)), 'banner shown');
    await startGroup(page, 0);
    await openCategory(page, 0);
    eq((await page.locator('.card-front .card-text').textContent()).trim(), 'Perché è così? Già più città, però');
  });

  t.test('data carte.csv missing: ONE file error, the grid still works', async ({ browser }) => {
    const page = await newPage(browser, { lang: 'it', fixture: 'nocarte' });
    const p = await probs(page);
    eq(p.length, 1, 'problems: ' + JSON.stringify(p));
    eq(sig(p[0]), 'carte.csv:null:err_file_csv:null:null');
    assert(!(await bannerHidden(page)), 'banner shown');
    await startGroup(page, 0);
    eq(await page.locator('.tile').count(), 8);
    await openCategory(page, 1);   // no cards: friendly message, no crash
    eq(await page.locator('.card-actions').count(), 0, 'no pills on the no-card face');
    assert((await page.locator('.card-text').textContent()).length > 0, 'nessuna_carta message');
  }, { allowErrors: true });   // the missing file is a 404 on purpose

  t.test('data carte without risposta and media columns: cards load, ONE optional-column warning', async ({ browser }) => {
    const base = await counts(await newPage(browser, { lang: 'it' }));
    const page = await newPage(browser, { lang: 'it', fixture: 'nooptcols' });
    const p = await probs(page);
    eq(p.length, 1, 'problems: ' + JSON.stringify(p));
    eq(p[0].key, 'err_colonna_opzionale');
    eq(p[0].file, 'carte.csv');
    eq(p[0].valore, 'media, risposta');
    eq((await counts(page)).carte, base.carte, 'all cards load');
    eq(await page.locator('#banner li').count(), 1);
    const txt = await page.locator('#banner li').textContent();
    assert(/media, risposta/.test(txt) && /vuota/.test(txt), 'warning text: ' + txt);
    await startGroup(page, 0);
    await openCategory(page, 1);
    eq(await page.locator('.btn-soluzione').count(), 0, 'no risposta -> no [soluzione]');
  });

  t.test('data empty livelli: ONE livelli problem, no per-card level errors, the screens show the message', async ({ browser }) => {
    const page = await newPage(browser, { lang: 'it', fixture: 'emptylivelli' });
    const p = await probs(page);
    eq(p.length, 1, 'problems: ' + JSON.stringify(p));
    eq(sig(p[0]), 'livelli.csv:null:err_file_vuoto:null:null');
    eq(only(p, 'carte.csv').length, 0, 'no carte problems');
    // group path: level screen
    await page.click('.start .btn');
    await page.click('.btn-yes');
    await page.waitForSelector('.question');
    eq(await page.locator('.btn-level').count(), 0);
    const msg = await page.locator('.empty-msg').textContent();
    assert(msg.includes('livelli.csv') && msg.includes('il file non contiene righe valide'), 'message: ' + msg);
    // player path: popup + [inizia] stays disabled
    await load(page);
    await chooseNumber(page, 1);
    await page.locator('.level-field').click();
    await page.waitForSelector('.panel');
    eq(await page.locator('.panel .btn-level').count(), 0);
    assert((await page.locator('.panel .empty-msg').textContent()).includes('il file non contiene righe valide'), 'popup message');
    await page.click('.panel .btn-cancel');
    assert(await page.locator('.btn-start').isDisabled(), '[inizia] must stay disabled');
  });

  t.test('data empty sfide: ONE sfide problem, no per-card sfida errors, the grid shows the message', async ({ browser }) => {
    const page = await newPage(browser, { lang: 'it', fixture: 'emptysfide' });
    const p = await probs(page);
    eq(p.length, 1, 'problems: ' + JSON.stringify(p));
    eq(sig(p[0]), 'sfide.csv:null:err_file_vuoto:null:null');
    eq(only(p, 'carte.csv').length, 0, 'no carte problems');
    await startGroup(page, 0);
    eq(await page.locator('.tile').count(), 0);
    const msg = await page.locator('.tiles .empty-msg').textContent();
    assert(msg.includes('sfide.csv') && msg.includes('il file non contiene righe valide'), 'message: ' + msg);
    eq(await page.locator('.pair.bottom .btn').count(), 2, 'bottom buttons still there');
  });

  t.test('data bad rows: did-you-mean, colours, duplicates, timer; rows skipped as before; banner order', async ({ browser }) => {
    const s = soft();
    const page = await newPage(browser, { lang: 'it', fixture: 'badrows' });
    const got = (await probs(page)).map(sig).sort();
    const want = [
      'livelli.csv:4:err_colore:rosso:null',
      'livelli.csv:5:err_duplicato:Facile:null',
      'sfide.csv:2:err_colore:rosso:null',
      'sfide.csv:3:err_colore:#12:null',
      'sfide.csv:7:err_timer:null:null',
      'sfide.csv:10:err_duplicato:PARLA DI TE:null',
      'carte.csv:3:err_sfida:CREA IL PLURAL:CREA IL PLURALE',
      'carte.csv:4:err_sfida:crea il plurale:CREA IL PLURALE',
      'carte.csv:5:err_livello:Facil:Facile',
      'carte.csv:5:err_nessun_livello:null:null',
      'carte.csv:6:err_livello:medio:Medio',
      'carte.csv:6:err_nessun_livello:null:null',
      'carte.csv:7:err_livello:Facil:Facile',
      'carte.csv:8:err_sfida:ZZZ QQQ:null',
      'carte.csv:9:err_livello:Quasi:null',
      'carte.csv:9:err_nessun_livello:null:null',
      'carte.csv:10:err_sfida:CREA  IL  PLURALE:CREA IL PLURALE'
    ].sort();
    eq(got.join('\n'), want.join('\n'), 'problem list');
    // invalid colours fall back to the default (blank); bad rows dropped exactly as before
    const d = await page.evaluate(() => {
      const a = window.__app;
      return { lvColor: a.livelli.find(l => l.livello === 'Difficile').colore, acc: a.sfide[0].accento, txt: a.sfide[1].colore_testo,
        timer: a.sfide[5].timer, carte: a.carte.map(c => c.testo + '=' + c.livelli.join('+')) };
    });
    eq(d.lvColor, '');
    eq(d.acc, '');
    eq(d.txt, '');
    eq(d.timer, null);
    eq(d.carte.join(','), 'Racconta di te=Facile,il libro=Medio');
    // banner: by file in the fixed order (livelli, sfide, carte), by row inside a file, suggestion text visible
    const lines = await page.locator('#banner li').allTextContents();
    const rank = { 'testi_ui.csv': 0, 'livelli.csv': 1, 'sfide.csv': 2, 'carte.csv': 3 };
    let prev = [-1, -1];
    lines.forEach(l => {
      if (l === '… e altri 1') return;   // carte.csv has 11 problems: 10 lines + this one (checked below)
      const m = l.match(/^(\S+\.csv)(?: riga (\d+))?:/);
      if (!m) return s.fail('unparsable banner line: ' + l);
      const cur = [rank[m[1]], m[2] ? Number(m[2]) : 0];
      if (cur[0] < prev[0] || (cur[0] === prev[0] && cur[1] < prev[1])) s.fail('banner out of order at: ' + l);
      prev = cur;
    });
    s.check(lines.length === 6 + 10 + 1, 'banner lines ' + lines.length + ' != 17 (6 + 10 of carte + 1 "altri")');
    s.check(lines[lines.length - 1] === '… e altri 1', 'last line: ' + lines[lines.length - 1]);
    s.check(lines.some(l => l.startsWith('carte.csv riga 5:') && l.includes("(forse 'Facile'?)")), 'did-you-mean text for Facil');
    s.check(lines.some(l => l.startsWith('carte.csv riga 8:') && !l.includes('forse')), 'no suggestion for ZZZ QQQ');
    s.check(lines.some(l => l.startsWith('sfide.csv riga 2:') && l.includes("'rosso' non è un colore valido")), 'err_colore text');
    s.done();
    // German text of the same notice
    await page.click('[data-fid="lang-de"]');
    const de = await page.locator('#banner li').allTextContents();
    assert(de.some(l => l.includes("(vielleicht 'Facile'?)")), 'German did-you-mean');
    assert(de.some(l => l.includes("'#12' ist keine gültige Farbe")), 'German err_colore');
  });

  t.test('data 25 bad rows in carte: 10 lines + the "... e altri 15" line', async ({ browser }) => {
    const page = await newPage(browser, { lang: 'it', fixture: 'manybad' });
    eq((await probs(page)).length, 25);
    const lis = page.locator('#banner li');
    eq(await lis.count(), 11);
    eq((await lis.last().textContent()).trim(), '… e altri 15');
    assert(await lis.last().evaluate(e => e.classList.contains('more')), 'last line is the .more line');
    const sum = await page.locator('#banner summary').textContent();
    assert(sum.trim().endsWith('(25)'), 'summary counts all problems: ' + sum);
    await page.click('[data-fid="lang-de"]');
    eq((await page.locator('#banner li').last().textContent()).trim(), '… und 15 weitere');
  });

  t.test('data 3000 cards load in under 5 s', async ({ browser }) => {
    const page = await newPage(browser, { lang: 'it', fixture: 'huge', goto: false });
    const t0 = Date.now();
    await load(page);
    const dt = Date.now() - t0;
    eq((await counts(page)).carte, 3000);
    eq((await probs(page)).length, 0, 'problems');
    assert(dt < 5000, 'load took ' + dt + ' ms');
    await startGroup(page, 0);
    await openCategory(page, 0);
    assert((await page.locator('.card-text').textContent()).startsWith('Carta numero'), 'a card is drawn');
  });

  t.test('data banner: expanded on start/setup, collapsed on gioco/carta; toggle and close keep the focus', async ({ browser }) => {
    const page = await newPage(browser, { lang: 'it', fixture: 'banner' });
    const open = () => page.evaluate(() => document.querySelector('#banner details').open);
    const n = await page.evaluate(() => window.__app.problems.length);
    assert((await page.locator('#banner summary').textContent()).trim().endsWith('(' + n + ')'), 'summary shows the count');
    assert(await open(), 'open on start');
    await page.click('.start .btn');
    assert(await open(), 'open on stesso');
    await page.click('.btn-no');
    await page.click('.btn-num >> nth=0');
    await page.waitForSelector('.name-input');
    assert(await open(), 'open on giocatori');
    await load(page);
    await startGroup(page, 0);
    assert(!(await open()), 'collapsed on gioco');
    await openCategory(page, 1);
    assert(!(await open()), 'collapsed on carta');
    // manual toggle holds on the same screen (re-render by language switch)
    await page.click('#banner summary');
    assert(await open(), 'toggled open');
    await page.click('[data-fid="lang-de"]');
    assert(await open(), 'toggle survives a re-render');
    // close: banner gone, focus not lost
    await page.click('.banner-close');
    assert(await bannerHidden(page), 'banner closed');
    const tag = await page.evaluate(() => document.activeElement.tagName);
    assert(tag !== 'BODY', 'focus on body after closing the banner');
  });
}
