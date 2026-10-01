'use strict';

/* ==========================================================================
   CONFIG - the only place with paths and column names
   ========================================================================== */
const CONFIG = {
  paths: {
    carte: 'data/carte.csv',
    sfide: 'data/sfide.csv',
    livelli: 'data/livelli.csv',
    testi: 'data/testi_ui.csv'
  },
  dirs: {
    sfondi: 'assets/sfondi/',
    icone: 'assets/icone/',
    carte: 'assets/carte/',
    media: 'assets/media/',
    fonts: 'assets/fonts/'
  },
  columns: {
    carte: ['sfida', 'livelli', 'testo', 'opzioni', 'media', 'immagine', 'risposta'],
    sfide: ['sfida', 'icona', 'accento', 'sfondo', 'timer', 'carattere', 'dimensione', 'colore_testo', 'allineamento'],
    livelli: ['livello', 'nome_de', 'colore', 'ordine'],
    testi: ['chiave', 'de', 'it']
  },
  delimiters: [';', ',', '\t'],
  imageExt: /\.(png|jpe?g|gif|svg|webp)$/i,
  // media column: extension decides image vs audio player
  mediaImageExt: /\.(png|jpe?g|gif|webp|svg)$/i,
  mediaAudioExt: /\.(mp3|m4a|aac|ogg|oga|wav|opus)$/i,
  alignments: ['sinistra', 'centro', 'destra'],
  // fallbacks for empty/invalid CSV cells and card-fit limits (used everywhere, never as literals)
  defaults: {
    fontMax: 28,            // card text size when sfide.csv `dimensione` is empty (px)
    fontMin: 14,            // the auto-shrink never goes below this (px); CSS .card-prompt min-height assumes it
    optFontMin: 12,         // Hilfe option font at the smallest fit (s = 0), px
    optFontRange: 3,        // ... and + this at s = 1 (= 15px, the normal button size)
    accent: 'var(--green)', // category accent colour when `accento` is empty
    alignment: 'centro',    // text alignment when `allineamento` is empty
    growMs: 350,            // grow-from-tile animation if --card-grow-time cannot be read
    doubleTapMs: 400        // [altra_carta] ignores a second tap within this time (double tap = ONE card)
  },
  // every key the app uses (all keys of testi_ui.csv)
  maxGiocatori: 6,
  REQUIRED_KEYS: [
    'nuova_partita', 'stesso_livello', 'si', 'no', 'quale_livello', 'quanti_giocatori', 'giocatore',
    'livello', 'inizia', 'scegli_categoria', 'aiuto', 'soluzione', 'esci', 'impostazioni', 'chiudi',
    'altra_carta', 'nessuna_carta', 'scegli_giocatore', 'lingua',
    'titolo', 'conferma_esci', 'annulla', 'timer_avvia', 'timer_pausa', 'timer_riprendi',
    'tempo_scaduto', 'media_mancante', 'avvisi_titolo',
    'riga', 'err_file_csv', 'err_codifica', 'err_colonna', 'err_csv_riga', 'err_duplicato', 'err_vuoto',
    'err_sfida', 'err_livello', 'err_nessun_livello', 'err_opzioni', 'err_testo', 'err_timer',
    'err_dimensione', 'err_allineamento', 'err_ordine', 'err_traduzione', 'err_chiave',
    'err_file', 'err_font', 'err_media_tipo'
  ]
};

const state = {
  lang: 'de',
  screen: 'start',
  setup: { stesso: null, livello: null, giocatori: [{ nome: '', livello: null }], attivo: 0 },
  pools: {},
  popup: null,    // index of the player whose level popup is open
  dialog: null,   // 'giocatore' | 'esci' on the game screen
  card: null,     // {sfida, idx} current card (idx = index in state.carte, or null = none)
  last: {},       // pool key -> last drawn card index (no immediate repeat)
  livelli: [],
  sfide: [],
  carte: [],
  testi: {},
  problems: [],   // {file, riga|null, key, vars, msg}
  fonts: {},      // name -> true/false
  dismissedAt: 0
};
window.__app = state;

/* ==========================================================================
   I18N
   ========================================================================== */
function fill(tpl, vars) {
  return String(tpl).replace(/\{(\w+)\}/g, (m, k) => (vars && k in vars ? vars[k] : m));
}
function levelName(l) { return state.lang === 'de' ? (l.nome_de || l.livello) : l.livello; }
function loadLang() {
  try { const v = localStorage.getItem('lang'); if (v === 'de' || v === 'it') state.lang = v; } catch (e) { /* ignore */ }
  document.documentElement.lang = state.lang;
}
function t(key, vars) {
  const e = state.testi[key];
  if (!e) return key;
  const other = state.lang === 'de' ? 'it' : 'de';
  const s = e[state.lang] || e[other];
  return s ? fill(s, vars) : key;
}

/* ==========================================================================
   PROBLEMS
   ========================================================================== */
function problem(file, riga, key, vars) {
  state.problems.push({ file, riga: riga == null ? null : riga, key, vars: vars || {}, msg: '' });
}
function problemText(p) {
  let m;
  if (state.testi[p.key]) m = t(p.key, p.vars);
  else m = p.key + (p.vars.valore != null ? ': ' + p.vars.valore : '');   // fallback if testi_ui failed
  return p.file + (p.riga != null ? ' ' + t('riga') + ' ' + p.riga : '') + ': ' + m;
}

/* ==========================================================================
   LOAD
   ========================================================================== */
async function fetchText(path) {
  const res = await fetch(path, { cache: 'no-cache' });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const buf = await res.arrayBuffer();
  let text, legacy = false;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(buf);
  } catch (e) {
    text = new TextDecoder('windows-1252').decode(buf);
    legacy = true;
  }
  return { text: text.replace(/^\uFEFF/, ''), legacy };
}

// Returns {rows:[{riga, d}]} or null (file-level failure, already reported).
async function loadCsv(name) {
  const path = CONFIG.paths[name];
  const file = path.split('/').pop();
  let got;
  try {
    got = await fetchText(path);
  } catch (e) {
    problem(file, null, 'err_file_csv');
    return null;
  }
  if (got.legacy) problem(file, null, 'err_codifica');
  let res;
  try {
    res = Papa.parse(got.text, {
      header: true,
      delimiter: '',
      delimitersToGuess: CONFIG.delimiters,
      skipEmptyLines: false,
      transformHeader: h => h.replace(/^\uFEFF/, '').trim(),
      transform: v => (v ?? '').trim()
    });
  } catch (e) {
    problem(file, null, 'err_file_csv');
    return null;
  }
  const fields = (res.meta && res.meta.fields) || [];
  const missing = CONFIG.columns[name].filter(c => !fields.includes(c));
  if (missing.length) {
    missing.forEach(c => problem(file, null, 'err_colonna', { valore: c }));
    return null;
  }
  const isEmpty = d => Object.values(d).every(v => v === '' || v == null || (Array.isArray(v) && !v.length));
  (res.errors || []).forEach(er => {
    if (er.code === 'UndetectableDelimiter') return;
    const d = res.data[er.row];
    if (d && isEmpty(d)) return;
    problem(file, er.row != null ? er.row + 2 : null, 'err_csv_riga', { valore: er.message });
  });
  const rows = [];
  res.data.forEach((d, i) => { if (!isEmpty(d)) rows.push({ riga: i + 2, d }); });
  return { file, rows };
}

// 'image' | 'audio' | null, decided by the file extension
const mediaKind = name => CONFIG.mediaImageExt.test(name) ? 'image' : CONFIG.mediaAudioExt.test(name) ? 'audio' : null;
const splitMulti = s => (s || '').split('|').map(x => x.trim()).filter(Boolean);

/* ==========================================================================
   VALIDATE (BUILD_BRIEF section 7) - skip bad rows, never crash
   ========================================================================== */
const fileRefs = [];   // {file, riga, dir, name}
function addRef(file, riga, dir, name) { if (name) fileRefs.push({ file, riga, dir, name }); }

function validateLivelli(csv) {
  const out = [], seen = new Set();
  if (!csv) return out;
  csv.rows.forEach(({ riga, d }) => {
    if (!d.livello) return problem(csv.file, riga, 'err_vuoto');
    if (seen.has(d.livello)) return problem(csv.file, riga, 'err_duplicato', { valore: d.livello });
    seen.add(d.livello);
    let ordine = Infinity;
    if (d.ordine !== '' && isFinite(Number(d.ordine))) ordine = Number(d.ordine);
    else problem(csv.file, riga, 'err_ordine');
    out.push({ livello: d.livello, nome_de: d.nome_de, colore: d.colore, ordine, riga });
  });
  return out.sort((a, b) => (a.ordine === b.ordine ? 0 : a.ordine < b.ordine ? -1 : 1));
}

function validateSfide(csv) {
  const out = [], seen = new Set();
  if (!csv) return out;
  csv.rows.forEach(({ riga, d }) => {
    if (!d.sfida) return problem(csv.file, riga, 'err_vuoto');
    if (seen.has(d.sfida)) return problem(csv.file, riga, 'err_duplicato', { valore: d.sfida });
    seen.add(d.sfida);
    const s = Object.assign({}, d, { riga });
    if (d.timer === '') s.timer = null;
    else if (/^\d+$/.test(d.timer) && Number(d.timer) > 0) s.timer = Number(d.timer);
    else { problem(csv.file, riga, 'err_timer'); s.timer = null; }
    if (d.dimensione === '') s.dimensione = null;
    else if (isFinite(Number(d.dimensione)) && Number(d.dimensione) > 0) s.dimensione = Number(d.dimensione);
    else { problem(csv.file, riga, 'err_dimensione'); s.dimensione = null; }
    if (d.allineamento === '') s.allineamento = CONFIG.defaults.alignment;
    else if (!CONFIG.alignments.includes(d.allineamento)) { problem(csv.file, riga, 'err_allineamento'); s.allineamento = CONFIG.defaults.alignment; }
    addRef(csv.file, riga, CONFIG.dirs.sfondi, d.sfondo);
    if (CONFIG.imageExt.test(d.icona)) addRef(csv.file, riga, CONFIG.dirs.icone, d.icona);
    out.push(s);
  });
  return out;
}

function validateCarte(csv) {
  const out = [];
  if (!csv) return out;
  const sfide = new Set(state.sfide.map(s => s.sfida));
  const livelli = new Set(state.livelli.map(l => l.livello));
  csv.rows.forEach(({ riga, d }) => {
    if (!sfide.has(d.sfida)) return problem(csv.file, riga, 'err_sfida', { valore: d.sfida });
    const lv = [];
    splitMulti(d.livelli).forEach(v => {
      if (livelli.has(v)) lv.push(v);
      else problem(csv.file, riga, 'err_livello', { valore: v });
    });
    if (!lv.length) return problem(csv.file, riga, 'err_nessun_livello');
    if (!d.testo && !d.immagine) return problem(csv.file, riga, 'err_testo');
    let opzioni = splitMulti(d.opzioni);
    if (opzioni.length && opzioni.length !== 3) { problem(csv.file, riga, 'err_opzioni'); opzioni = []; }
    let media = d.media;
    if (media && !mediaKind(media)) { problem(csv.file, riga, 'err_media_tipo', { valore: media }); media = ''; }
    addRef(csv.file, riga, CONFIG.dirs.media, media);
    addRef(csv.file, riga, CONFIG.dirs.carte, d.immagine);
    out.push(Object.assign({}, d, { livelli: lv, opzioni, media, riga }));
  });
  return out;
}

function validateTesti(csv) {
  const map = {};
  if (csv) {
    csv.rows.forEach(({ riga, d }) => {
      if (!d.chiave) return problem(csv.file, riga, 'err_vuoto');
      if (!d.de || !d.it) problem(csv.file, riga, 'err_traduzione');
      if (map[d.chiave]) return problem(csv.file, riga, 'err_duplicato', { valore: d.chiave });
      map[d.chiave] = { de: d.de, it: d.it };
    });
  }
  return map;
}

function checkRequiredKeys(file) {
  CONFIG.REQUIRED_KEYS.forEach(k => {
    if (!state.testi[k]) problem(file, null, 'err_chiave', { valore: k });
  });
}

// Async file existence checks; dedupe URLs but report every referencing row.
function checkFiles() {
  const cache = new Map();
  const exists = url => {
    if (!cache.has(url)) {
      cache.set(url, fetch(url, { method: 'HEAD', cache: 'no-cache' }).then(r => r.ok, () => false));
    }
    return cache.get(url);
  };
  return Promise.all(fileRefs.map(async r => {
    const ok = await exists(r.dir + encodeURIComponent(r.name));
    if (!ok) problem(r.file, r.riga, 'err_file', { valore: r.name });
  })).then(renderBanner);
}

/* ==========================================================================
   FONTS
   ========================================================================== */
async function loadFonts() {
  const users = {};
  state.sfide.forEach(s => { if (s.carattere) (users[s.carattere] = users[s.carattere] || []).push(s); });
  await Promise.all(Object.keys(users).map(async name => {
    try {
      const ff = new FontFace(name, 'url("' + CONFIG.dirs.fonts + encodeURIComponent(name) + '.woff2")');
      await ff.load();
      document.fonts.add(ff);
      state.fonts[name] = true;
    } catch (e) {
      state.fonts[name] = false;
      users[name].forEach(s => problem(CONFIG.paths.sfide.split('/').pop(), s.riga, 'err_font', { valore: name }));
    }
  }));
}

/* ==========================================================================
   RENDER - banner, language switch, one function per screen, single render()
   ========================================================================== */
function renderBanner() {
  const el = document.getElementById('banner');
  el.textContent = '';
  if (!state.problems.length || state.problems.length <= state.dismissedAt) { el.hidden = true; return; }
  const h = document.createElement('h2');
  h.textContent = t('avvisi_titolo');
  const ul = document.createElement('ul');
  state.problems.forEach(p => {
    p.msg = problemText(p);
    const li = document.createElement('li');
    li.textContent = p.msg;
    ul.appendChild(li);
  });
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = t('chiudi');
  btn.addEventListener('click', () => { state.dismissedAt = state.problems.length; renderBanner(); });
  el.append(h, btn, ul);
  el.hidden = false;
}

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}
function button(label, cls, onClick) {
  const b = el('button', cls, label);
  b.type = 'button';
  b.addEventListener('click', onClick);
  return b;
}
function marked(b, yes) { if (yes) { b.classList.add('marked'); b.setAttribute('aria-pressed', 'true'); } return b; }
function levelBtn(l, cls, onClick) {
  const b = button(levelName(l), cls, onClick);
  if (l.colore) b.style.background = l.colore;
  return b;
}
const findLevel = id => state.livelli.find(l => l.livello === id) || null;
const playerName = i => state.setup.giocatori[i].nome || (t('giocatore') + ' ' + (i + 1));

// Language switch: lives in its own <header class="topbar"> row at the top of every screen (in flow, never overlaps content).
function langBox() {
  const box = el('div');
  box.id = 'lang';
  box.setAttribute('role', 'group');
  box.setAttribute('aria-label', t('lingua'));
  ['de', 'it'].forEach(code => {
    const b = button(code.toUpperCase(), 'lang-btn', () => setLang(code));
    b.setAttribute('aria-pressed', String(state.lang === code));
    if (state.lang === code) b.classList.add('active');
    box.appendChild(b);
  });
  return box;
}

function setLang(code) {
  if (code === state.lang) return;
  state.lang = code;
  document.documentElement.lang = code;
  try { localStorage.setItem('lang', code); } catch (e) { /* storage unavailable: keep in-session */ }
  render();
}

function go(screen) { state.screen = screen; render(); }

function resetSetup() {
  state.setup = { stesso: null, livello: null, giocatori: [{ nome: '', livello: null }], attivo: 0 };
  state.pools = {};
  state.last = {};
  state.card = null;
  state.popup = null;
  state.dialog = null;
}
function goSettings() { state.popup = null; state.dialog = null; go('stesso'); }

function renderStart(app) {
  const box = el('div', 'start');
  box.append(el('h1', null, t('titolo')),
    button(t('nuova_partita'), 'btn', () => { resetSetup(); go('stesso'); }));
  app.appendChild(box);
}

function renderStesso(app) {
  const s = state.setup;
  const stack = el('div', 'pair');
  app.append(el('div', 'question', t('stesso_livello')),
    stack);
  stack.append(
    marked(button(t('si'), 'btn btn-yes', () => { s.stesso = true; go('livello'); }), s.stesso === true),
    marked(button(t('no'), 'btn btn-no', () => { s.stesso = false; go('quanti'); }), s.stesso === false));
}

function renderLivello(app) {
  const s = state.setup;
  const stack = el('div', 'stack');
  state.livelli.forEach(l => {
    stack.appendChild(marked(levelBtn(l, 'btn btn-level', () => { s.livello = l.livello; s.stesso = true; go('gioco'); }),
      s.livello === l.livello));
  });
  app.append(el('div', 'question', t('quale_livello')), stack);
}

function renderQuanti(app) {
  const g = state.setup.giocatori;
  const grid = el('div', 'grid3');
  for (let n = 1; n <= CONFIG.maxGiocatori; n++) {
    grid.appendChild(marked(button(String(n), 'btn btn-num', () => {
      while (g.length < n) g.push({ nome: '', livello: null });
      g.length = n;
      go('giocatori');
    }), g.length === n));
  }
  app.append(el('div', 'question', t('quanti_giocatori')), grid);
}

function renderGiocatori(app) {
  const s = state.setup;
  const rows = el('div', 'rows');
  s.giocatori.forEach((p, i) => {
    const row = el('div', 'prow');
    const inp = el('input', 'name-input');
    inp.type = 'text';
    inp.value = p.nome;
    inp.placeholder = t('giocatore') + ' ' + (i + 1);
    inp.maxLength = 40;
    inp.autocomplete = 'off';
    inp.addEventListener('input', () => { p.nome = inp.value; });
    const l = findLevel(p.livello);
    const lb = button(l ? levelName(l) : t('livello'), 'btn level-field', () => { state.popup = i; render(); });
    if (l && l.colore) lb.style.background = l.colore;
    if (!l) lb.classList.add('empty');
    row.append(inp, lb);
    rows.appendChild(row);
  });
  const go_ = button(t('inizia'), 'btn btn-start', () => {
    if (!s.giocatori.every(p => findLevel(p.livello))) return;
    s.stesso = false;
    s.attivo = 0;
    go('gioco');
  });
  go_.disabled = !s.giocatori.every(p => findLevel(p.livello));
  app.append(rows, go_);
  if (state.popup != null && state.popup < s.giocatori.length) app.appendChild(levelPopup(state.popup));
}

function closePopup() { state.popup = null; state.dialog = null; render(); }

function levelPopup(i) {
  const back = el('div', 'backdrop');
  back.addEventListener('click', e => { if (e.target === back) closePopup(); });
  const panel = el('div', 'panel');
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.append(el('h2', null, t('livello')));
  state.livelli.forEach(l => {
    panel.appendChild(marked(levelBtn(l, 'btn btn-level', () => {
      state.setup.giocatori[i].livello = l.livello;
      closePopup();
    }), state.setup.giocatori[i].livello === l.livello));
  });
  panel.appendChild(button(t('annulla'), 'btn btn-cancel', closePopup));
  back.appendChild(panel);
  return back;
}

/* ==========================================================================
   GAME SCREEN (category grid) + CARD
   ========================================================================== */
const curLevelId = () => {
  const s = state.setup;
  if (s.stesso) return s.livello;
  const p = s.giocatori[s.attivo];
  return p ? p.livello : null;
};

// Icon = emoji (text) or image file in assets/icone/ (detected by extension). Missing image: hidden, no crash.
function iconNode(sf, cls) {
  const box = el('span', cls);
  box.setAttribute('aria-hidden', 'true');
  if (CONFIG.imageExt.test(sf.icona || '')) {
    const img = document.createElement('img');
    img.alt = '';
    img.src = CONFIG.dirs.icone + encodeURIComponent(sf.icona);
    img.addEventListener('error', () => { img.hidden = true; });
    box.appendChild(img);
  } else {
    box.textContent = sf.icona || '';
  }
  box.style.setProperty('--acc', sf.accento || CONFIG.defaults.accent);
  return box;
}

// Top field. clickable = player mode on the grid only.
function topField(clickable) {
  const s = state.setup;
  if (s.stesso) {
    const l = findLevel(s.livello);
    const txt = (t('livello') + ' – ' + (l ? levelName(l) : '')).toUpperCase();
    const d = el('div', 'topfield', txt);
    d.title = txt;
    return d;
  }
  const p = s.giocatori[s.attivo];
  const l = p && findLevel(p.livello);
  const txt = playerName(s.attivo) + ' – ' + (l ? levelName(l) : '');
  if (!clickable) { const d = el('div', 'topfield', txt); d.title = txt; return d; }
  const b = button(txt, 'topfield topfield-btn', () => { state.dialog = 'giocatore'; render(); });
  if (l && l.colore) b.style.background = l.colore;
  b.title = txt;
  return b;
}

function dialogBack(panel) {
  const back = el('div', 'backdrop');
  back.addEventListener('click', e => { if (e.target === back) closePopup(); });
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  back.appendChild(panel);
  return back;
}

function playerPopup() {
  const panel = el('div', 'panel');
  panel.appendChild(el('h2', null, t('scegli_giocatore')));
  state.setup.giocatori.forEach((p, i) => {
    const l = findLevel(p.livello);
    const b = button(playerName(i) + ' – ' + (l ? levelName(l) : ''), 'btn btn-level', () => {
      state.setup.attivo = i;
      closePopup();
    });
    if (l && l.colore) b.style.background = l.colore;
    panel.appendChild(marked(b, state.setup.attivo === i));
  });
  panel.appendChild(button(t('annulla'), 'btn btn-cancel', closePopup));
  return dialogBack(panel);
}

function exitPopup() {
  const panel = el('div', 'panel');
  panel.appendChild(el('h2', null, t('conferma_esci')));
  const pair = el('div', 'pair');
  // setup is kept until [nuova_partita]
  pair.append(button(t('si'), 'btn btn-yes', () => { state.dialog = null; go('start'); }),
    button(t('annulla'), 'btn btn-cancel', closePopup));
  panel.appendChild(pair);
  return dialogBack(panel);
}

function renderGioco(app) {
  app.appendChild(topField(!state.setup.stesso));
  app.appendChild(el('h2', 'scegli', t('scegli_categoria')));
  const grid = el('div', 'tiles');
  if (fadeGrid) { grid.classList.add('fade-in'); fadeGrid = false; }
  state.sfide.forEach(sf => {
    const tile = button('', 'tile', () => openCard(sf, tile.getBoundingClientRect()));
    tile.style.setProperty('--acc', sf.accento || CONFIG.defaults.accent);
    tile.append(iconNode(sf, 'circle'), el('span', 'tile-name', sf.sfida));
    grid.appendChild(tile);
  });
  app.appendChild(grid);
  const bar = el('div', 'pair bottom');
  bar.append(button(t('esci'), 'btn btn-secondary', () => { state.dialog = 'esci'; render(); }),
    button(t('impostazioni'), 'btn btn-secondary', goSettings));
  app.appendChild(bar);
  if (state.dialog === 'giocatore' && !state.setup.stesso) app.appendChild(playerPopup());
  else if (state.dialog === 'esci') app.appendChild(exitPopup());
}

/* ---- Card drawing: no-repeat pool per category + level ---- */
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Returns an index into state.carte, or null if no card matches.
function drawCard(sf) {
  const lv = curLevelId();
  const key = sf.sfida + '|' + lv;
  let pool = state.pools[key];
  if (!pool || !pool.length) {
    const all = [];
    state.carte.forEach((c, i) => { if (c.sfida === sf.sfida && c.livelli.includes(lv)) all.push(i); });
    if (!all.length) return null;
    pool = state.pools[key] = shuffle(all);
    // cards are taken from the END; avoid repeating the last one right after a refill
    if (pool.length > 1 && pool[pool.length - 1] === state.last[key]) {
      const j = Math.floor(Math.random() * (pool.length - 1));
      [pool[j], pool[pool.length - 1]] = [pool[pool.length - 1], pool[j]];
    }
  }
  const idx = pool.pop();
  state.last[key] = idx;
  return idx;
}

// Per-card view state: lives as long as the card; a new card resets flip, Hilfe and feature state.
let lastDrawAt = 0;    // timestamp of the last draw; [altra_carta] ignores clicks within CONFIG.defaults.doubleTapMs of it (double tap = ONE card)
function newCardState(sf) {
  lastDrawAt = Date.now();
  return { sfida: sf.sfida, idx: drawCard(sf), flipped: false, hilfe: null, fx: {} };
}
let growFrom = null;   // tile rect (viewport coords) for the grow-from-tile animation; consumed by renderCarta
let fadeGrid = false;  // true after [chiudi]: the grid fades in
let fadeCard = false;  // true for a newly drawn card (tile / [altra_carta]): only then does the card fade in
function openCard(sf, fromRect) {
  state.card = newCardState(sf);
  growFrom = fromRect || null;
  fadeCard = true;
  go('carta');
}
const reducedMotion = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
// FLIP: the wrapper (.card-wrap, NOT .card-flip which rotates) animates from the tile's rect to its final place.
function growCard(wrap, from) {
  const flip = wrap.querySelector('.card-flip');
  if (!flip || !wrap.animate || reducedMotion()) return;
  const f = flip.getBoundingClientRect(), w = wrap.getBoundingClientRect();
  if (!f.width || !f.height || !from.width) return;
  const fx = f.left + f.width / 2, fy = f.top + f.height / 2;
  const k = from.width / f.width;   // ONE uniform scale (no stretched text); centre starts at the tile's centre
  const dx = from.left + from.width / 2 - fx, dy = from.top + from.height / 2 - fy;
  const ms = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--card-grow-time')) || CONFIG.defaults.growMs;
  wrap.style.transformOrigin = (fx - w.left) + 'px ' + (fy - w.top) + 'px';
  const anim = wrap.animate([
    { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + k + ')', opacity: 0.6 },
    { transform: 'none', opacity: 1 }
  ], { duration: ms, easing: 'ease-out' });
  anim.onfinish = anim.oncancel = () => { wrap.style.transformOrigin = ''; };
}

function titleNode(sf) {
  const box = el('div', 'card-title');
  box.appendChild(el('span', 'card-title-text', sf.sfida));   // the span is line-clamped to 2 lines
  return box;
}

/* One face of the card ('front' | 'back'). Back = same template as the front (DECISIONS 10):
   sfondo -> same background; no sfondo (or a template that failed to load) -> cream card with the CSS frame,
   centred title and category icon. The immagine override only replaces the FRONT; its back is sfondo or the
   plain CSS card. card = null -> the category face with the nessuna_carta message in the text area. */
function buildFace(sf, card, side) {
  const D = CONFIG.defaults;
  const c = el('div', 'card card-' + side);
  // per-category text style via CSS custom properties (no per-category CSS rules)
  const fam = sf.carattere ? '"' + sf.carattere.replace(/"/g, '') + '", var(--font-fallback)' : 'var(--font-fallback)';
  c.style.setProperty('--card-font', fam);
  if (sf.colore_testo) c.style.setProperty('--card-color', sf.colore_testo);
  c.style.setProperty('--card-align', { sinistra: 'left', centro: 'center', destra: 'right' }[sf.allineamento] || 'center');
  c.dataset.max = String(sf.dimensione || D.fontMax);
  c.style.setProperty('--card-fs', (sf.dimensione || D.fontMax) + 'px');
  c.style.setProperty('--acc', sf.accento || D.accent);

  if (card && side === 'front' && card.immagine) {
    // a) full Canva card image as the front
    c.classList.add('card-image');
    const img = document.createElement('img');
    img.className = 'card-img';
    img.alt = card.testo || '';
    img.src = CONFIG.dirs.carte + encodeURIComponent(card.immagine);
    img.addEventListener('error', () => { img.hidden = true; });
    c.appendChild(img);
    return c;
  }
  if (sf.sfondo && !sf.sfondoBroken) {
    // b) category template image: app draws only the text area content + pills
    c.classList.add('card-tpl');
    c.style.backgroundImage = 'url("' + CONFIG.dirs.sfondi + encodeURIComponent(sf.sfondo) + '")';
  } else {
    // c) CSS variant: tricolore frame (::before), centred title, icon circle
    c.append(iconNode(sf, 'circle card-icon'), titleNode(sf));
  }
  const body = el('div', 'card-body');
  const pr = el('div', 'card-prompt');
  pr.appendChild(el('span', 'card-text', !card ? t('nessuna_carta') : side === 'front' ? card.testo : card.risposta));
  body.appendChild(pr);
  c.appendChild(body);
  return c;
}

/* ---- Hilfe (multiple choice). State in state.card.hilfe = { order:[option idx], picked:idx|null };
   option 0 is the correct one (first in the CSV), order is the shuffled display order. ---- */
function renderOpts(face, card) {
  const old = face.querySelector('.card-opts');
  if (old) old.remove();
  const h = state.card.hilfe;
  if (!h) return;
  const box = el('div', 'card-opts');
  box.setAttribute('role', 'group');
  h.order.forEach(i => {
    const b = button(card.opzioni[i], 'card-opt', () => {
      if (h.picked != null) return;
      h.picked = i;
      renderOpts(face, card);
      fitCard();
    });
    if (h.picked != null) {
      b.disabled = true;
      if (i === 0) b.classList.add('right');
      else if (i === h.picked) b.classList.add('wrong');
      else b.classList.add('dim');
    }
    box.appendChild(b);
  });
  (face.querySelector('.card-body') || face).appendChild(box);
}

function buildCard(sf, card) {
  const flip = el('div', 'card-flip');
  if (!card) {
    flip.appendChild(buildFace(sf, null, 'front'));
    return flip;
  }
  const front = buildFace(sf, card, 'front');
  flip.appendChild(front);

  const acts = el('div', 'card-actions');
  if (card.opzioni.length === 3) {
    const a = button(t('aiuto'), 'card-btn btn-aiuto', () => {
      state.card.hilfe = { order: shuffle([0, 1, 2]), picked: null };
      a.remove();
      renderOpts(front, card);
      fitCard();
    });
    if (!state.card.hilfe) acts.appendChild(a);
  }
  if (card.risposta) {
    const b = button(t('soluzione'), 'card-btn btn-soluzione', () => setFlipped(flip, sf, card, true));
    acts.appendChild(b);
  }
  front.appendChild(acts);
  renderOpts(front, card);   // restores Hilfe after a re-render (e.g. language switch)

  if (card.risposta) {
    attachSwipe(flip, () => setFlipped(flip, sf, card, !state.card.flipped));
    if (state.card.flipped) setFlipped(flip, sf, card, true);
  }
  return flip;
}

// Back face is built on the first flip. Front tap never flips; back tap flips back.
function setFlipped(flip, sf, card, on) {
  const front = flip.querySelector('.card-front');
  let back = flip.querySelector('.card-back');
  if (on && !back) {
    back = buildFace(sf, card, 'back');
    back.setAttribute('role', 'button');
    back.tabIndex = 0;
    back.addEventListener('click', () => setFlipped(flip, sf, card, false));
    back.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFlipped(flip, sf, card, false); }
    });
    flip.appendChild(back);
    fitCard();
  }
  state.card.flipped = on;
  flip.classList.toggle('flipped', on);
  front.inert = on;
  if (back) back.inert = !on;
}

// Horizontal swipe (|dx| >= 50 and |dx| > |dy|) on the card. CSS touch-action: pan-y keeps vertical scroll.
function attachSwipe(flip, onSwipe) {
  let sx = 0, sy = 0, suppress = false;
  const stop = () => {
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', stop);
  };
  function up(e) {
    stop();
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.abs(dx) >= 50 && Math.abs(dx) > Math.abs(dy)) { suppress = true; onSwipe(); }
  }
  flip.addEventListener('pointerdown', e => {
    if (!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
    if (e.target.closest && e.target.closest('audio')) return;
    suppress = false;
    sx = e.clientX; sy = e.clientY;
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', stop);
  });
  // the click that ends a swipe on the back must not flip it straight back
  flip.addEventListener('click', e => { if (suppress) { suppress = false; e.stopPropagation(); e.preventDefault(); } }, true);
}

// Auto-fit, per face: ONE parameter s in [0,1] scales the prompt (fontMin..dimensione) and the Hilfe options
// (optFontMin..+optFontRange) together; binary search for the largest s where the text area neither overflows
// vertically (media + prompt + options all count) nor has a word wider than the line (measured with
// overflow-wrap: normal). Nothing fits at s = 0 -> .fit-break (words may break); still too tall ->
// .fit-scroll on the body (the area scrolls, with a shadow cue). Text is never silently clipped.
function fitFace(c) {
  const p = c.querySelector('.card-prompt'), body = c.querySelector('.card-body');
  if (!p || !body) return;
  const D = CONFIG.defaults;
  const max = Math.max(Number(c.dataset.max) || D.fontMax, D.fontMin);
  const set = s => {
    c.style.setProperty('--card-fs', (D.fontMin + s * (max - D.fontMin)) + 'px');
    c.style.setProperty('--opt-fs', (D.optFontMin + s * D.optFontRange) + 'px');
  };
  const fits = () => p.scrollWidth <= p.clientWidth && body.scrollHeight <= body.clientHeight;
  c.classList.remove('fit-break');
  body.classList.remove('fit-scroll', 'more-below');
  set(1);
  if (fits()) return;
  set(0);
  if (fits()) {
    let lo = 0, hi = 1;   // fits at lo, not at hi
    for (let i = 0; i < 12; i++) {
      const mid = (lo + hi) / 2;
      set(mid);
      if (fits()) lo = mid; else hi = mid;
    }
    set(lo);
    return;
  }
  // nothing fits at s = 0: a word wider than the line may now break (only at the minimum size: a split word is
  // never combined with a larger font); too tall even so -> the text area scrolls.
  if (p.scrollWidth > p.clientWidth) c.classList.add('fit-break');
  if (!fits()) {
    body.classList.add('fit-scroll');
    moreCue(body);
  }
}
// .more-below (shadow at the bottom edge of a scrolling text area) while there is more content below
function moreCue(body) {
  const upd = () => body.classList.toggle('more-below', body.scrollTop + body.clientHeight < body.scrollHeight - 1);
  if (!body.dataset.cue) { body.dataset.cue = '1'; body.addEventListener('scroll', upd, { passive: true }); }
  upd();
}
function fitCard() { document.querySelectorAll('.card-flip .card').forEach(fitFace); }
window.addEventListener('resize', fitCard);

/* ==========================================================================
   CARD_FEATURES - per-category / per-card features. Adding a feature = adding one entry.
   Entry: { name, applies(card, sfida) -> bool, render(ctx) -> cleanup fn | undefined }
   ctx = { card, sfida,
           front : element inside the front face's content area (prepend/append extras here),
           below : slot OUTSIDE the flipping card, between card and controls (visible when flipped),
           store : per-card object for this feature's state; survives a re-render (language switch)
                   and is discarded with the card,
           refit(): re-run the prompt auto-shrink after changing the front's layout }
   All cleanups run before any other card is rendered and when leaving the card screen.
   ========================================================================== */
const CARD_FEATURES = [];
let cardCleanups = [];
function runCleanups() {
  const fns = cardCleanups;
  cardCleanups = [];
  fns.forEach(fn => { try { fn(); } catch (e) { console.error(e); } });
}

/* ---- feature: timer (sfide.csv `timer` = seconds). Counts from timestamps, starts on tap (DECISIONS 16).
   On language switch the card is re-rendered: timer state is KEPT (it lives in ctx.store and is
   timestamp based), so a running timer simply continues; the interval is cleared and recreated. ---- */
CARD_FEATURES.push({
  name: 'timer',
  applies: (card, sfida) => !!sfida.timer,
  render(ctx) {
    const st = ctx.store;
    const total = ctx.sfida.timer * 1000;
    if (st.left == null) Object.assign(st, { left: total, startedAt: null, started: false, done: false });
    const box = el('div', 'card-timer');
    const disp = el('div', 'timer-display');
    const msg = el('div', 'timer-msg');
    msg.setAttribute('role', 'status');
    const btn = button('', 'btn-timer', () => {
      if (st.done) return;
      if (st.startedAt == null) { st.startedAt = Date.now(); st.started = true; }
      else { st.left = remaining(); st.startedAt = null; }
      paint();
    });
    box.append(disp, btn, msg);
    let iv = setInterval(tick, 250);

    function remaining() {
      return st.startedAt == null ? st.left : Math.max(0, st.left - (Date.now() - st.startedAt));
    }
    const fmt = ms => { const s = Math.ceil(ms / 1000); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
    function paint() {
      disp.textContent = fmt(remaining());
      btn.hidden = st.done;
      btn.textContent = st.startedAt != null ? t('timer_pausa') : st.started ? t('timer_riprendi') : t('timer_avvia');
      box.classList.toggle('timeup', st.done);
      msg.textContent = st.done ? t('tempo_scaduto') : '';
    }
    function tick() {
      if (!st.done && st.startedAt != null && remaining() <= 0) {
        st.done = true; st.left = 0; st.startedAt = null;
        clearInterval(iv); iv = null;
        try { if (navigator.vibrate) navigator.vibrate([300, 150, 300, 150, 600]); } catch (e) { /* unsupported */ }
      }
      paint();
    }
    tick();
    ctx.below.appendChild(box);
    return () => { if (iv != null) clearInterval(iv); iv = null; };
  }
});

/* ---- feature: media (carte.csv `media`): image above the prompt, or an audio player. ---- */
CARD_FEATURES.push({
  name: 'media',
  // skipped when the card has its own full `immagine` (the media would overlap the card image)
  applies: card => !!card.media && !!mediaKind(card.media) && !card.immagine,
  render(ctx) {
    const url = CONFIG.dirs.media + encodeURIComponent(ctx.card.media);
    const isAudio = mediaKind(ctx.card.media) === 'audio';
    let node = isAudio ? document.createElement('audio') : document.createElement('img');
    let audio = null;
    const missing = () => {
      const m = el('div', 'card-media card-media-missing', t('media_mancante'));
      node.replaceWith(m);
      node = m;
      audio = null;
      ctx.refit();
    };
    node.className = 'card-media ' + (isAudio ? 'card-media-audio' : 'card-media-img');
    if (isAudio) {
      audio = node;
      node.controls = true;
      node.preload = 'none';
      node.setAttribute('preload', 'none');
    } else {
      node.alt = '';
      node.addEventListener('load', ctx.refit);
    }
    node.addEventListener('error', missing);
    node.src = url;
    ctx.front.insertBefore(node, ctx.front.firstChild);
    ctx.refit();
    return () => { if (audio) { try { audio.pause(); } catch (e) { /* ignore */ } } };
  }
});

function renderCarta(app) {
  const sf = state.card && state.sfide.find(x => x.sfida === state.card.sfida);
  if (!sf) { state.screen = 'gioco'; return renderGioco(app); }
  const card = state.card.idx != null ? state.carte[state.card.idx] : null;
  app.appendChild(topField(false));
  const wrap = el('div', 'card-wrap');
  const flip = buildCard(sf, card);
  if (fadeCard) { flip.classList.add('card-new'); fadeCard = false; }
  wrap.appendChild(flip);
  app.appendChild(wrap);
  if (growFrom) { growCard(wrap, growFrom); growFrom = null; }
  if (card) {
    const below = el('div', 'card-below');
    const body = flip.querySelector('.card-front .card-body') || flip.querySelector('.card-front');
    CARD_FEATURES.forEach(f => {
      try {
        if (!f.applies(card, sf)) return;
        const store = (state.card.fx[f.name] = state.card.fx[f.name] || {});
        const cleanup = f.render({ card, sfida: sf, front: body, below, store, refit: fitCard });
        if (typeof cleanup === 'function') cardCleanups.push(cleanup);
      } catch (e) { console.error(e); }
    });
    if (below.children.length) app.appendChild(below);
  }
  const bar = el('div', 'pair bottom');
  const more = button(t('altra_carta'), 'btn', () => {
    if (Date.now() - lastDrawAt < CONFIG.defaults.doubleTapMs) return;
    state.card = newCardState(sf);
    fadeCard = true;
    render();
  });
  more.disabled = !card;
  bar.append(button(t('chiudi'), 'btn btn-secondary', () => { fadeGrid = true; go('gioco'); }), more);
  app.appendChild(bar);
  fitCard();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitCard);
}

const SCREENS = {
  start: renderStart, stesso: renderStesso, livello: renderLivello,
  quanti: renderQuanti, giocatori: renderGiocatori, gioco: renderGioco, carta: renderCarta
};

function render() {
  runCleanups();   // card features (timer, audio...) are torn down on every re-render / screen change
  const app = document.getElementById('app');
  app.textContent = '';
  const bar = el('header', 'topbar');
  bar.appendChild(langBox());
  app.appendChild(bar);
  (SCREENS[state.screen] || renderStart)(app);
  document.body.className = 'screen-' + state.screen;   // after the screen ran: renderCarta may fall back to 'gioco'
  renderBanner();
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && (state.popup != null || state.dialog)) closePopup();
});

/* ==========================================================================
   PRELOAD - every image the app can show, fetched once after init so cards never pop in.
   A sfondo that fails to load marks its sfida (sfondoBroken): its cards then render as the CSS variant.
   Audio is deliberately NOT preloaded (large, and the player streams it on demand).
   ========================================================================== */
const preloaded = [];   // keeps the Image objects (and so their cache entries) alive
function preloadAssets() {
  const seen = new Set();
  const fetchImg = (dir, name) => {
    const url = dir + encodeURIComponent(name);
    if (seen.has(url)) return;
    seen.add(url);
    const img = new Image();
    img.src = url;
    preloaded.push(img);
  };
  state.sfide.forEach(sf => {
    if (sf.sfondo) {
      const img = new Image();
      img.addEventListener('error', () => {
        sf.sfondoBroken = true;
        if (state.screen === 'carta' && state.card && state.card.sfida === sf.sfida) render();   // card already on screen
      });
      img.src = CONFIG.dirs.sfondi + encodeURIComponent(sf.sfondo);
      preloaded.push(img);
    }
    if (CONFIG.imageExt.test(sf.icona || '')) fetchImg(CONFIG.dirs.icone, sf.icona);
  });
  state.carte.forEach(c => {
    if (c.immagine) fetchImg(CONFIG.dirs.carte, c.immagine);
    if (c.media && mediaKind(c.media) === 'image') fetchImg(CONFIG.dirs.media, c.media);
  });
}

/* ==========================================================================
   INIT
   ========================================================================== */
async function init() {
  loadLang();
  const [testi, livelli, sfide, carte] = await Promise.all(
    ['testi', 'livelli', 'sfide', 'carte'].map(n => loadCsv(n).catch(() => null))
  );
  state.testi = validateTesti(testi);
  if (testi) checkRequiredKeys(testi.file);
  state.livelli = validateLivelli(livelli);
  state.sfide = validateSfide(sfide);
  state.carte = validateCarte(carte);
  render();
  preloadAssets();
  await loadFonts();
  fitCard();   // custom fonts are in: re-fit a card that is already on screen
  renderBanner();
  await checkFiles();
}

init().catch(e => { console.error(e); });
