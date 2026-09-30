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
  alignments: ['sinistra', 'centro', 'destra'],
  // every key the app uses (all keys of testi_ui.csv)
  REQUIRED_KEYS: [
    'nuova_partita', 'stesso_livello', 'si', 'no', 'quale_livello', 'quanti_giocatori', 'giocatore',
    'livello', 'inizia', 'scegli_categoria', 'aiuto', 'soluzione', 'esci', 'impostazioni', 'chiudi',
    'altra_carta', 'nessuna_carta', 'scegli_giocatore', 'lingua',
    'titolo', 'conferma_esci', 'annulla', 'timer_avvia', 'timer_pausa', 'timer_riprendi',
    'tempo_scaduto', 'media_mancante', 'avvisi_titolo',
    'riga', 'err_file_csv', 'err_codifica', 'err_colonna', 'err_csv_riga', 'err_duplicato', 'err_vuoto',
    'err_sfida', 'err_livello', 'err_nessun_livello', 'err_opzioni', 'err_testo', 'err_timer',
    'err_dimensione', 'err_allineamento', 'err_ordine', 'err_traduzione', 'err_chiave',
    'err_file', 'err_font'
  ]
};

const state = {
  lang: 'de',
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
   I18N (minimal; full toggle in slice 2)
   ========================================================================== */
function fill(tpl, vars) {
  return String(tpl).replace(/\{(\w+)\}/g, (m, k) => (vars && k in vars ? vars[k] : m));
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
    if (d.allineamento === '') s.allineamento = 'centro';
    else if (!CONFIG.alignments.includes(d.allineamento)) { problem(csv.file, riga, 'err_allineamento'); s.allineamento = 'centro'; }
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
    addRef(csv.file, riga, CONFIG.dirs.media, d.media);
    addRef(csv.file, riga, CONFIG.dirs.carte, d.immagine);
    out.push(Object.assign({}, d, { livelli: lv, opzioni, riga }));
  });
  return out;
}

function validateTesti(csv) {
  const map = {};
  if (csv) {
    csv.rows.forEach(({ riga, d }) => {
      if (!d.chiave) return problem(csv.file, riga, 'err_vuoto');
      if (!d.de || !d.it) problem(csv.file, riga, 'err_traduzione');
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
   RENDER (slice 1: banner + start screen)
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

function renderStart() {
  const app = document.getElementById('app');
  app.textContent = '';
  const box = document.createElement('div');
  box.className = 'start';
  const h1 = document.createElement('h1');
  h1.textContent = t('titolo');
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn';
  b.textContent = t('nuova_partita');
  box.append(h1, b);
  app.appendChild(box);
}

/* ==========================================================================
   INIT
   ========================================================================== */
async function init() {
  const [testi, livelli, sfide, carte] = await Promise.all(
    ['testi', 'livelli', 'sfide', 'carte'].map(n => loadCsv(n).catch(() => null))
  );
  state.testi = validateTesti(testi);
  if (testi) checkRequiredKeys(testi.file);
  state.livelli = validateLivelli(livelli);
  state.sfide = validateSfide(sfide);
  state.carte = validateCarte(carte);
  renderStart();
  renderBanner();
  await loadFonts();
  renderBanner();
  await checkFiles();
}

init().catch(e => { console.error(e); });
