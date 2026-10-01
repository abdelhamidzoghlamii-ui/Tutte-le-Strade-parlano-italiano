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
  // required = key columns (a file without one is rejected: err_colonna); optional = known columns that may be
  // missing (ONE warning per file, err_colonna_opzionale; the column counts as blank in every row).
  // A new column of a later batch = one more name in the right `optional` list.
  columns: {
    carte: { required: ['sfida', 'livelli', 'testo'], optional: ['opzioni', 'media', 'immagine', 'risposta'] },
    sfide: { required: ['sfida'], optional: ['icona', 'accento', 'sfondo', 'timer', 'carattere', 'dimensione', 'colore_testo', 'allineamento',
      'icona_posizione', 'icona_dimensione', 'testo_margine_alto', 'testo_margine_basso'] },
    livelli: { required: ['livello'], optional: ['nome_de', 'colore', 'ordine'] },
    testi: { required: ['chiave', 'de', 'it'], optional: [] }
  },
  fileOrder: ['testi', 'livelli', 'sfide', 'carte'],   // banner order (then by row)
  bannerMaxPerFile: 10,                                // banner lines per file; the rest = one err_altri line
  bannerOpenScreens: ['start', 'stesso', 'livello', 'quanti', 'giocatori', 'anteprima'],   // banner expanded here, collapsed elsewhere
  didYouMeanMax: 2,                                    // max Levenshtein distance for "forse ...?"
  delimiters: [';', ',', '\t'],
  imageExt: /\.(png|jpe?g|gif|svg|webp)$/i,
  // media column: extension decides image vs audio player
  mediaImageExt: /\.(png|jpe?g|gif|webp|svg)$/i,
  mediaAudioExt: /\.(mp3|m4a|aac|ogg|oga|wav|opus)$/i,
  alignments: ['sinistra', 'centro', 'destra'],
  iconPositions: ['alto-sinistra', 'alto-centro', 'alto-destra', 'basso-sinistra', 'basso-centro', 'basso-destra'],
  // limits of the card-layout columns of sfide.csv (icona_dimensione in px of the 750x1050 template, margins in % of the card height)
  limits: { iconSize: [20, 400], margin: [0, 45], marginSum: 80 },
  // preview (index.html?anteprima): fixed card heights in px, key = testi_ui.csv key of the button
  previewSizes: [{ key: 'anteprima_piccola', h: 360 }, { key: 'anteprima_media', h: 480 }, { key: 'anteprima_grande', h: 600 }],
  previewDefaultSize: 'anteprima_media',
  // geometry of the 750x1050 Canva template, in px (keep in sync with --icon-top / --icon-bottom in style.css): used by the
  // err_icona_testo check (does the app icon reach into the text area?)
  template: { h: 1050, iconTop: 70, iconBottom: 128, titleGap: 6, titleMin: 50 },
  // fallbacks for empty/invalid CSV cells and card-fit limits (used everywhere, never as literals)
  defaults: {
    fontMax: 28,            // card text size when sfide.csv `dimensione` is empty (px)
    fontMin: 14,            // the auto-shrink never goes below this (px); CSS .card-prompt min-height assumes it
    optFontMin: 12,         // Hilfe option font at the smallest fit (s = 0), px
    optFontRange: 3,        // ... and + this at s = 1 (= 15px, the normal button size)
    accent: 'var(--green)', // category accent colour when `accento` is empty
    alignment: 'centro',    // text alignment when `allineamento` is empty
    growMs: 350,            // grow-from-tile animation if --card-grow-time cannot be read
    doubleTapMs: 400,       // [altra_carta] ignores a second tap within this time (double tap = ONE card)
    // card layout when the sfide.csv columns are blank / invalid. Keep in sync with the CSS fallbacks in style.css (.card).
    iconPos: 'basso-destra',    // icona_posizione (CSS cards; template cards draw NO app icon unless it is set, decision D2)
    iconSize: 100,              // icona_dimensione, px of the 750x1050 template
    textTop: 20,                // testo_margine_alto, % of the card height
    textBottom: 22,             // testo_margine_basso
    liveDelayMs: 60             // [altra_carta] live region: cleared, then filled after this delay (so an identical text is read again)
  },
  // every key the app uses (all keys of testi_ui.csv)
  maxGiocatori: 6,
  // saved game (localStorage, one key): see saveGame() / loadSave(). Rules are in README (technical part).
  storageKey: 'tlspi-partita',
  saveMaxAgeMs: 24 * 60 * 60 * 1000,    // an older save is discarded
  saveFutureMs: 5 * 60 * 1000,          // a save dated further in the future than this is discarded (clock nonsense)
  saveVersion: 2,                       // a save with another version is discarded silently (no migration)
  saveScreens: ['stesso', 'livello', 'quanti', 'giocatori', 'gioco', 'carta'],   // only these are saved / restored
  nameMax: 40,                          // player name length (input maxLength, and the cut on restore)
  REQUIRED_KEYS: [
    'nuova_partita', 'stesso_livello', 'si', 'no', 'quale_livello', 'quanti_giocatori', 'giocatore',
    'livello', 'inizia', 'scegli_categoria', 'aiuto', 'soluzione', 'esci', 'impostazioni', 'chiudi',
    'altra_carta', 'nessuna_carta', 'scegli_giocatore', 'lingua',
    'titolo', 'conferma_esci', 'annulla', 'timer_avvia', 'timer_pausa', 'timer_riprendi',
    'tempo_scaduto', 'media_mancante', 'avvisi_titolo',
    'riga', 'err_file_csv', 'err_codifica', 'err_colonna', 'err_csv_riga', 'err_duplicato', 'err_vuoto',
    'err_sfida', 'err_livello', 'err_nessun_livello', 'err_opzioni', 'err_testo', 'err_timer',
    'err_dimensione', 'err_allineamento', 'err_ordine', 'err_traduzione', 'err_chiave',
    'err_file', 'err_font', 'err_media_tipo',
    'err_colonna_opzionale', 'err_file_vuoto', 'err_altri', 'err_colore', 'err_forse', 'giusto', 'sbagliato',
    'err_posizione', 'err_icona_dimensione', 'err_margine', 'err_icona_testo',
    'torna_al_gioco', 'anteprima_titolo', 'anteprima_dimensione', 'anteprima_piccola', 'anteprima_media',
    'anteprima_grande', 'anteprima_aiuto', 'anteprima_retro', 'anteprima_area', 'anteprima_standard',
    'anteprima_standard_modello', 'partita_in_corso', 'continua',
    'tocca_a', 'livello_di', 'nascondi', 'err_salvataggio'
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
  if (p.vars.forse) m += ' ' + (state.testi.err_forse ? t('err_forse', { valore: p.vars.forse }) : '(' + p.vars.forse + '?)');
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
  const cols = CONFIG.columns[name];
  const missing = cols.required.filter(c => !fields.includes(c));
  if (missing.length) {
    missing.forEach(c => problem(file, null, 'err_colonna', { valore: c }));
    return null;
  }
  // missing optional columns: ONE warning for the file, the column is blank in every row
  const absent = cols.optional.filter(c => !fields.includes(c));
  if (absent.length) problem(file, null, 'err_colonna_opzionale', { valore: absent.join(', ') });
  const isEmpty = d => Object.values(d).every(v => v === '' || v == null || (Array.isArray(v) && !v.length));
  (res.errors || []).forEach(er => {
    if (er.code === 'UndetectableDelimiter') return;
    const d = res.data[er.row];
    if (d && isEmpty(d)) return;
    problem(file, er.row != null ? er.row + 2 : null, 'err_csv_riga', { valore: er.message });
  });
  const rows = [];
  res.data.forEach((d, i) => {
    if (isEmpty(d)) return;
    absent.forEach(c => { d[c] = ''; });
    rows.push({ riga: i + 2, d });
  });
  return { file, rows, absent };
}

// 'image' | 'audio' | null, decided by the file extension
const mediaKind = name => CONFIG.mediaImageExt.test(name) ? 'image' : CONFIG.mediaAudioExt.test(name) ? 'audio' : null;
const splitMulti = s => (s || '').split('|').map(x => x.trim()).filter(Boolean);
// CSS colour check; an invalid colour is reported (err_colore) and the default is used (blank)
const validColor = v => typeof CSS === 'undefined' || !CSS.supports || CSS.supports('color', v);
function checkColor(file, riga, obj, field) {
  if (obj[field] && !validColor(obj[field])) {
    problem(file, riga, 'err_colore', { valore: obj[field] });
    obj[field] = '';
  }
}

// "did you mean": name equal ignoring case, accents and (multiple) spaces; else the closest by Levenshtein distance
const normName = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
function levenshtein(a, b) {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}
function didYouMean(value, names) {
  const n = normName(value);
  if (!n) return null;
  const same = names.find(x => normName(x) === n);
  if (same) return same;
  let best = null, bestD = Infinity;
  names.forEach(x => {
    const m = normName(x), d = levenshtein(n, m);
    // d < length: on very short names a distance of 2 would match anything
    if (d <= CONFIG.didYouMeanMax && d < Math.min(n.length, m.length) && d < bestD) { best = x; bestD = d; }
  });
  return best;
}

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
    else if (!csv.absent.includes('ordine')) problem(csv.file, riga, 'err_ordine');   // missing column: already warned once
    const lv = { livello: d.livello, nome_de: d.nome_de, colore: d.colore, ordine, riga };
    checkColor(csv.file, riga, lv, 'colore');
    out.push(lv);
  });
  if (!out.length) problem(csv.file, null, 'err_file_vuoto');
  return out.sort((a, b) => (a.ordine === b.ordine ? 0 : a.ordine < b.ordine ? -1 : 1));
}

// Number cell of the layout columns: "20", "20%", "20,5" (German decimal comma), "100px", " 100 " -> number; anything else -> NaN
function parseNum(v) {
  const m = String(v == null ? '' : v).trim().match(/^(\d+(?:[.,]\d+)?)\s*(?:px|%)?$/i);
  return m ? Number(m[1].replace(',', '.')) : NaN;
}
const inRange = (n, [lo, hi]) => n >= lo && n <= hi;
// Layout columns of sfide.csv (icona_posizione, icona_dimensione, testo_margine_alto/basso). The checked values go to
// s.iconPos / s.iconSize / s.textTop / s.textBottom; null = blank or invalid -> the default (CONFIG.defaults) is used.
function checkLayout(file, riga, d, s) {
  const L = CONFIG.limits;
  s.iconPos = s.iconSize = s.textTop = s.textBottom = null;
  if (d.icona_posizione) {
    const pos = d.icona_posizione.trim().toLowerCase().replace(/\s+/g, '-');
    if (CONFIG.iconPositions.includes(pos)) s.iconPos = pos;
    else problem(file, riga, 'err_posizione', { valore: d.icona_posizione });
  }
  if (d.icona_dimensione) {
    const n = parseNum(d.icona_dimensione);
    if (inRange(n, L.iconSize)) s.iconSize = n;
    else problem(file, riga, 'err_icona_dimensione', { valore: d.icona_dimensione, min: L.iconSize[0], max: L.iconSize[1] });
  }
  // {valore} = the cells as written (column name = value), so Chiara sees which one is wrong
  const given = ['testo_margine_alto', 'testo_margine_basso'].filter(c => d[c]).map(c => c + ' = ' + d[c]).join(', ');
  const mv = { valore: given, min: L.margin[0], max: L.margin[1], somma: L.marginSum };
  const top = d.testo_margine_alto ? parseNum(d.testo_margine_alto) : null;
  const bottom = d.testo_margine_basso ? parseNum(d.testo_margine_basso) : null;
  const okT = top != null && inRange(top, L.margin), okB = bottom != null && inRange(bottom, L.margin);
  if ((top != null && !okT) || (bottom != null && !okB)) problem(file, riga, 'err_margine', mv);   // one message per row
  if (okT && okB && top + bottom > L.marginSum) { problem(file, riga, 'err_margine', mv); return; }   // only the sum is wrong: ONE message, both defaults
  if (okT) s.textTop = top;
  if (okB) s.textBottom = bottom;
}

// err_icona_testo: the app-drawn icon box reaches into the text area band (computed in template px from position, size and
// margins), or an alto-centro icon on a CSS card leaves less than titleMin px for the title. Only where the app really
// draws the icon (a template without icona_posizione has none, decision D2). Names the margin to change.
function checkIconFit(file, riga, s) {
  const D = CONFIG.defaults, T = CONFIG.template;
  const tpl = !!s.sfondo;
  const pos = s.iconPos || (tpl ? null : D.iconPos);
  if (!pos) return;
  const size = s.iconSize ?? D.iconSize;
  const bandTop = (s.textTop ?? D.textTop) / 100 * T.h, bandBottom = T.h - (s.textBottom ?? D.textBottom) / 100 * T.h;
  const iconBottomEdge = T.iconTop + size;           // alto: lower edge of the icon
  const iconTopEdge = T.h - T.iconBottom - size;     // basso: upper edge of the icon
  let margine = null;
  if (pos.startsWith('alto')) {
    if (iconBottomEdge > bandTop) margine = 'testo_margine_alto';
    else if (pos === 'alto-centro' && !tpl && bandTop - (iconBottomEdge + T.titleGap) < T.titleMin) margine = 'testo_margine_alto';
  } else if (iconTopEdge < bandBottom) margine = 'testo_margine_basso';
  if (margine) problem(file, riga, 'err_icona_testo', { margine });
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
    checkColor(csv.file, riga, s, 'accento');
    checkColor(csv.file, riga, s, 'colore_testo');
    checkLayout(csv.file, riga, d, s);
    checkIconFit(csv.file, riga, s);
    addRef(csv.file, riga, CONFIG.dirs.sfondi, d.sfondo);
    if (CONFIG.imageExt.test(d.icona)) addRef(csv.file, riga, CONFIG.dirs.icone, d.icona);
    out.push(s);
  });
  if (!out.length) problem(csv.file, null, 'err_file_vuoto');
  return out;
}

function validateCarte(csv) {
  const out = [];
  if (!csv) return out;
  const sfNames = state.sfide.map(s => s.sfida), lvNames = state.livelli.map(l => l.livello);
  const sfide = new Set(sfNames), livelli = new Set(lvNames);
  csv.rows.forEach(({ riga, d }) => {
    // no sfide / no levels at all: that file is already reported once, so no per-card cascade (the cards are dropped)
    if (!sfide.has(d.sfida)) {
      if (sfide.size) problem(csv.file, riga, 'err_sfida', { valore: d.sfida, forse: didYouMean(d.sfida, sfNames) });
      return;
    }
    if (!livelli.size) return;
    const lv = [];
    splitMulti(d.livelli).forEach(v => {
      if (livelli.has(v)) lv.push(v);
      else problem(csv.file, riga, 'err_livello', { valore: v, forse: didYouMean(v, lvNames) });
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
/* Banner: a collapsible <details>. Summary = "<avvisi_titolo> (N)" + the close button (a sibling, not nested in the
   summary). Open by default on the start/setup screens, collapsed on gioco/carta (it must not shrink the card);
   a manual toggle holds until the screen changes. Problems are shown by file (CONFIG.fileOrder), then by row;
   at most CONFIG.bannerMaxPerFile lines per file, then one err_altri line. */
let bannerOpen = true, bannerScreen = null;
function fileRank(file) {
  const i = CONFIG.fileOrder.findIndex(n => CONFIG.paths[n].split('/').pop() === file);
  return i < 0 ? CONFIG.fileOrder.length : i;
}
function sortedProblems() {
  return state.problems.map((p, i) => ({ p, i }))
    .sort((a, b) => fileRank(a.p.file) - fileRank(b.p.file) || (a.p.riga == null ? -1 : a.p.riga) - (b.p.riga == null ? -1 : b.p.riga) || a.i - b.i)
    .map(x => x.p);
}
function renderBanner() {
  const box = document.getElementById('banner');
  const act = document.activeElement;
  const fid = act && box.contains(act) ? act.dataset.fid : null;
  if (bannerScreen !== state.screen) { bannerScreen = state.screen; bannerOpen = CONFIG.bannerOpenScreens.includes(state.screen); }
  box.textContent = '';
  if (!state.problems.length || state.problems.length <= state.dismissedAt) { box.hidden = true; return; }
  const title = t('avvisi_titolo') + ' (' + state.problems.length + ')';
  box.setAttribute('role', 'region');
  box.setAttribute('aria-label', title);
  const det = document.createElement('details');
  det.open = bannerOpen;
  det.addEventListener('toggle', () => { bannerOpen = det.open; });
  const sum = el('summary', null, title);
  sum.dataset.fid = 'banner-toggle';
  const ul = document.createElement('ul');
  let shown = 0, curFile = null, rest = 0;
  const flush = () => { if (rest) ul.appendChild(el('li', 'more', t('err_altri', { valore: rest }))); rest = 0; };
  sortedProblems().forEach(p => {
    p.msg = problemText(p);
    if (p.file !== curFile) { flush(); curFile = p.file; shown = 0; }
    if (shown >= CONFIG.bannerMaxPerFile) { rest++; return; }
    shown++;
    ul.appendChild(el('li', null, p.msg));
  });
  flush();
  det.append(sum, ul);
  const btn = button(t('chiudi'), 'banner-close', () => { state.dismissedAt = state.problems.length; renderBanner(); focusMain(); }, 'banner-close');
  box.append(det, btn);
  box.hidden = false;
  if (fid) focusFid(fid);
}

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}
// fid = stable id (data-fid): render() uses it to put the focus back on the same control after a re-render
function button(label, cls, onClick, fid) {
  const b = el('button', cls, label);
  b.type = 'button';
  b.addEventListener('click', onClick);
  if (fid) b.dataset.fid = fid;
  return b;
}
function marked(b, yes) { if (yes) { b.classList.add('marked'); b.setAttribute('aria-pressed', 'true'); } return b; }
function levelBtn(l, cls, onClick, fid) {
  const b = button(levelName(l), cls, onClick, fid);
  if (l.colore) b.style.background = l.colore;
  return b;
}
const findLevel = id => state.livelli.find(l => l.livello === id) || null;
const playerName = i => state.setup.giocatori[i].nome || (t('giocatore') + ' ' + (i + 1));
// shown in place of an empty list (no valid levels / no categories): "<file>: <err_file_vuoto>"
function emptyNote(name) {
  return el('p', 'empty-msg', CONFIG.paths[name].split('/').pop() + ': ' + t('err_file_vuoto'));
}

// Language switch: lives in its own <header class="topbar"> row at the top of every screen (in flow, never overlaps content).
function langBox() {
  const box = el('div');
  box.id = 'lang';
  box.setAttribute('role', 'group');
  box.setAttribute('aria-label', t('lingua'));
  ['de', 'it'].forEach(code => {
    const b = button(code.toUpperCase(), 'lang-btn', () => setLang(code), 'lang-' + code);
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

function go(screen) { untouched = false; state.screen = screen; render(); }

function resetSetup() {
  state.setup = { stesso: null, livello: null, giocatori: [{ nome: '', livello: null }], attivo: 0 };
  state.pools = {};
  state.last = {};
  state.card = null;
  state.popup = null;
  state.dialog = null;
}
function goSettings() { state.popup = null; state.dialog = null; go('stesso'); }

/* ==========================================================================
   SAVED GAME (localStorage, ONE key: CONFIG.storageKey). The game survives a reload: init offers to continue (resume
   dialog), restoreGame() rebuilds the state defensively. Saved: lang, screen, setup, no-repeat pools / last drawn card
   and the open card (+ Hilfe). Never saved: timer/feature state, flip, popups/dialogs, the preview. Cards are stored by
   content (cardId), not by row number, so carte.csv may change between sessions. All storage access is try/catch.
   ========================================================================== */
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; /* blocked or full: the game keeps working */ } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } }
};
const cardId = c => [c.sfida, c.testo, c.immagine].join('\u241f');   // content-based id of a card
const clearSave = () => store.del(CONFIG.storageKey);
let untouched = false;   // true right after [nuova_partita]: nothing is saved until the player does something (go())
let pendingSave = null;  // a valid save found at startup, waiting for the resume dialog
let saveWarned = false;  // the failed-write warning (err_salvataggio) is shown once per session

function saveGame() {
  if (untouched || !CONFIG.saveScreens.includes(state.screen)) return;   // start screen and preview never save
  const ids = list => list.map(i => state.carte[i]).filter(Boolean).map(cardId);
  const pools = {}, last = {};
  Object.keys(state.pools).forEach(k => { pools[k] = ids(state.pools[k]); });
  Object.keys(state.last).forEach(k => { const c = state.carte[state.last[k]]; if (c) last[k] = cardId(c); });
  let card = null;
  const cs = state.card;
  if (state.screen === 'carta' && cs) {
    const c = cs.idx != null ? state.carte[cs.idx] : null;
    if (cs.idx == null || c) {
      card = { sfida: cs.sfida, id: c ? cardId(c) : null, hilfe: cs.hilfe ? { order: cs.hilfe.order.slice(), picked: cs.hilfe.picked, hidden: !!cs.hilfe.hidden } : null };
    }
  }
  const s = state.setup;
  const ok = store.set(CONFIG.storageKey, JSON.stringify({
    v: CONFIG.saveVersion, savedAt: Date.now(), lang: state.lang, screen: state.screen,
    setup: { stesso: s.stesso, livello: s.livello, giocatori: s.giocatori.map(p => ({ nome: p.nome, livello: p.livello })), attivo: s.attivo },
    pools, last, card
  }));
  if (!ok && !saveWarned) { saveWarned = true; problem('localStorage', null, 'err_salvataggio'); renderBanner(); }
}
window.addEventListener('pagehide', saveGame);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') saveGame(); });

// The saved game, or null (and the key is removed) when it is unusable: unparsable, wrong version, too old, from the
// future, unknown screen.
function loadSave() {
  const raw = store.get(CONFIG.storageKey);
  if (raw == null) return null;
  let s = null;
  try { s = JSON.parse(raw); } catch (e) { /* garbage */ }
  const now = Date.now();
  const ok = s && typeof s === 'object' && s.v === CONFIG.saveVersion && Number.isFinite(s.savedAt) &&
    now - s.savedAt <= CONFIG.saveMaxAgeMs && s.savedAt - now <= CONFIG.saveFutureMs && CONFIG.saveScreens.includes(s.screen);
  if (!ok) { clearSave(); return null; }
  return s;
}

// Rebuilds the state from a save against the CURRENT csv data; anything that no longer fits is dropped or sent back to
// the screen where it can be fixed. Throws on a structurally broken save (the caller then starts clean).
function applySave(sv) {
  const lvOk = v => (typeof v === 'string' && findLevel(v)) ? v : null;
  const su = sv.setup;
  if (!su || typeof su !== 'object' || !Array.isArray(su.giocatori) || su.giocatori.length < 1 || su.giocatori.length > CONFIG.maxGiocatori) {
    throw new Error('bad setup');
  }
  const giocatori = su.giocatori.map(p => ({
    nome: p && typeof p.nome === 'string' ? p.nome.slice(0, CONFIG.nameMax) : '',
    livello: p ? lvOk(p.livello) : null
  }));
  const attivo = Number.isInteger(su.attivo) ? Math.min(Math.max(su.attivo, 0), giocatori.length - 1) : 0;
  state.setup = { stesso: su.stesso === true || su.stesso === false ? su.stesso : null, livello: lvOk(su.livello), giocatori, attivo };
  state.popup = null;
  state.dialog = null;
  if (sv.lang === 'de' || sv.lang === 'it') {
    state.lang = sv.lang;
    document.documentElement.lang = sv.lang;
    store.set('lang', sv.lang);
  }

  let screen = sv.screen;
  if ((screen === 'gioco' || screen === 'carta') && !giocatori.every(p => p.livello)) screen = 'giocatori';   // the empty level field is where it gets fixed

  // pools / last: card ids -> current indexes, only cards that still exist and still belong to that sfida + level
  const byId = new Map();
  state.carte.forEach((c, i) => { const id = cardId(c); if (!byId.has(id)) byId.set(id, i); });
  const valid = (id, sfida, lv) => {
    const i = byId.get(id);
    const c = i != null && state.carte[i];
    return c && c.sfida === sfida && c.livelli.includes(lv) ? i : null;
  };
  const splitKey = k => { const n = k.lastIndexOf('|'); return n < 0 ? null : [k.slice(0, n), k.slice(n + 1)]; };
  const known = k => { const p = splitKey(k); return p && state.sfide.some(x => x.sfida === p[0]) && findLevel(p[1]) ? p : null; };
  state.pools = {};
  state.last = {};
  if (sv.pools && typeof sv.pools === 'object') {
    Object.keys(sv.pools).forEach(k => {
      const p = known(k);
      if (!p || !Array.isArray(sv.pools[k])) return;
      const out = [];
      sv.pools[k].forEach(id => { const i = valid(id, p[0], p[1]); if (i != null && !out.includes(i)) out.push(i); });
      state.pools[k] = out;
    });
  }
  if (sv.last && typeof sv.last === 'object') {
    Object.keys(sv.last).forEach(k => {
      const p = known(k);
      const i = p ? valid(sv.last[k], p[0], p[1]) : null;
      if (i != null) state.last[k] = i;
    });
  }

  // the open card
  state.card = null;
  if (screen === 'carta') {
    const c = sv.card;
    const sf = c && typeof c === 'object' ? state.sfide.find(x => x.sfida === c.sfida) : null;
    if (!sf) screen = 'gioco';
    else if (c.id === null) state.card = { sfida: sf.sfida, idx: null, flipped: false, hilfe: null, fx: {} };
    else {
      const idx = valid(c.id, sf.sfida, curLevelId());
      if (idx == null) screen = 'gioco';
      else {
        const h = c.hilfe;
        const hilfeOk = h && typeof h === 'object' && state.carte[idx].opzioni.length === 3 && Array.isArray(h.order) && h.order.length === 3 &&
          [0, 1, 2].every(n => h.order.includes(n)) && (h.picked === null || h.picked === 0 || h.picked === 1 || h.picked === 2);   // `hidden`: anything but true = shown
        state.card = { sfida: sf.sfida, idx, flipped: false, hilfe: hilfeOk ? { order: h.order.slice(), picked: h.picked, hidden: h.hidden === true } : null, fx: {} };
        fadeCard = true;
      }
    }
  }
  state.screen = screen;
}

function resumeGame() {
  const sv = pendingSave;
  pendingSave = null;
  try {
    applySave(sv);
    render();   // saves the sanitized state
  } catch (e) {
    clearSave();
    resetSetup();
    state.screen = 'start';
    render();
  }
}

// [nuova_partita] (start screen and resume dialog): forget the save, empty setup. Nothing is saved again until the
// player does something.
function newGame() {
  clearSave();
  pendingSave = null;
  resetSetup();
  untouched = true;
  state.screen = 'stesso';
  render();
}

function renderStart(app) {
  const box = el('div', 'start');
  box.append(el('h1', null, t('titolo')),
    button(t('nuova_partita'), 'btn', newGame, 'nuova'));
  app.appendChild(box);
  if (state.dialog === 'riprendi') app.appendChild(resumePopup());
}

function renderStesso(app) {
  const s = state.setup;
  const stack = el('div', 'pair');
  app.append(el('div', 'question', t('stesso_livello')),
    stack);
  stack.append(
    marked(button(t('si'), 'btn btn-yes', () => { s.stesso = true; go('livello'); }, 'si'), s.stesso === true),
    marked(button(t('no'), 'btn btn-no', () => { s.stesso = false; go('quanti'); }, 'no'), s.stesso === false));
}

function renderLivello(app) {
  const s = state.setup;
  const stack = el('div', 'stack');
  state.livelli.forEach((l, i) => {
    stack.appendChild(marked(levelBtn(l, 'btn btn-level', () => {
      s.livello = l.livello;
      s.stesso = true;
      s.giocatori.forEach(p => { p.livello = l.livello; });   // prefilled for everybody, still editable on the players screen
      go('quanti');
    }, 'level-' + i),
      s.livello === l.livello));
  });
  if (!state.livelli.length) stack.appendChild(emptyNote('livelli'));
  app.append(el('div', 'question', t('quale_livello')), stack);
}

function renderQuanti(app) {
  const g = state.setup.giocatori;
  const grid = el('div', 'grid3');
  for (let n = 1; n <= CONFIG.maxGiocatori; n++) {
    grid.appendChild(marked(button(String(n), 'btn btn-num', () => {
      while (g.length < n) g.push({ nome: '', livello: state.setup.stesso === true ? state.setup.livello : null });
      g.length = n;
      go('giocatori');
    }, 'num-' + n), g.length === n));
  }
  app.append(el('div', 'question', t('quanti_giocatori')), grid);
}

function renderGiocatori(app) {
  const s = state.setup;
  const rows = el('div', 'rows');
  rows.setAttribute('role', 'group');
  rows.setAttribute('aria-label', t('giocatore'));
  s.giocatori.forEach((p, i) => {
    const row = el('div', 'prow');
    const inp = el('input', 'name-input');
    inp.type = 'text';
    inp.value = p.nome;
    inp.placeholder = t('giocatore') + ' ' + (i + 1);
    inp.maxLength = CONFIG.nameMax;
    inp.autocomplete = 'off';
    inp.setAttribute('aria-label', t('giocatore') + ' ' + (i + 1));
    inp.dataset.fid = 'name-' + i;
    inp.addEventListener('input', () => { p.nome = inp.value; saveGame(); });
    const l = findLevel(p.livello);
    const lb = button(l ? levelName(l) : t('livello'), 'btn level-field', () => openPopup(i, 'lvl-' + i), 'lvl-' + i);
    lb.setAttribute('aria-label', t('giocatore') + ' ' + (i + 1) + ': ' + t('livello') + ' – ' + (l ? levelName(l) : ''));
    if (l && l.colore) lb.style.background = l.colore;
    if (!l) lb.classList.add('empty');
    row.append(inp, lb);
    rows.appendChild(row);
  });
  const go_ = button(t('inizia'), 'btn btn-start', () => {
    if (!s.giocatori.every(p => findLevel(p.livello))) return;
    s.attivo = 0;
    go('gioco');
  }, 'inizia');
  go_.disabled = !s.giocatori.every(p => findLevel(p.livello));
  app.append(rows, go_);
  if (state.popup != null && state.popup < s.giocatori.length) app.appendChild(levelPopup(state.popup));
}

/* ---- Dialogs (level popup, player popup, exit confirmation). Every dialog: role=dialog + aria-labelledby (its h2),
   focus to the first button on open, Tab trapped inside, everything outside inert (see render), and on close the focus
   goes back to the control that opened it (dialogOpener = its data-fid). ---- */
let dialogOpener = null;
function openPopup(i, openerFid) { dialogOpener = openerFid; state.popup = i; render(); }
function openDialog(name, openerFid) { dialogOpener = openerFid; state.dialog = name; render(); }
function closePopup() { state.popup = null; state.dialog = null; render(); }

function dialogBack(name, panel, titleText, closable = true) {
  const back = el('div', 'backdrop');
  back.dataset.dlg = name;
  if (closable) back.addEventListener('click', e => { if (e.target === back) closePopup(); });   // the resume dialog is not closable
  const h = el('h2', null, titleText);
  h.id = 'dlg-title';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-labelledby', h.id);
  panel.prepend(h);
  back.appendChild(panel);
  return back;
}

function levelPopup(i) {
  const panel = el('div', 'panel');
  state.livelli.forEach((l, k) => {
    panel.appendChild(marked(levelBtn(l, 'btn btn-level', () => {
      state.setup.giocatori[i].livello = l.livello;
      closePopup();
    }, 'plevel-' + k), state.setup.giocatori[i].livello === l.livello));
  });
  if (!state.livelli.length) panel.appendChild(emptyNote('livelli'));
  panel.appendChild(button(t('annulla'), 'btn btn-cancel', closePopup, 'annulla'));
  return dialogBack('popup', panel, t('livello'));
}

/* ==========================================================================
   GAME SCREEN (category grid) + CARD
   ========================================================================== */
// A game is always a list of players: the current level is the active player's (stesso / livello are only setup memory)
const curLevelId = () => {
  const p = state.setup.giocatori[state.setup.attivo];
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

// Top field: "<tocca_a> <name> – <level>" on the level's colour. clickable = on the grid only (opens the player dialog).
function topField(clickable) {
  const s = state.setup;
  const p = s.giocatori[s.attivo];
  const l = p && findLevel(p.livello);
  const txt = t('tocca_a') + ' ' + playerName(s.attivo) + ' – ' + (l ? levelName(l) : '');
  const d = clickable ? button(txt, 'topfield topfield-btn', () => openDialog('giocatore', 'topfield'), 'topfield') : el('div', 'topfield', txt);
  if (l && l.colore) d.style.background = l.colore;
  d.title = txt;
  return d;
}

// Top-field dialog (grid): title = whose turn; section 1 = the level of THIS player only; section 2 = pick another player.
function playerPopup() {
  const s = state.setup, a = s.attivo, cur = s.giocatori[a];
  const panel = el('div', 'panel');
  const section = (id, heading) => {
    const sec = el('div', 'dlg-section');
    const h = el('h3', null, heading);
    h.id = id;
    sec.setAttribute('role', 'group');
    sec.setAttribute('aria-labelledby', id);
    sec.appendChild(h);
    panel.appendChild(sec);
    return sec;
  };
  const lv = section('dlg-lvl', t('livello_di', { valore: playerName(a) }));
  state.livelli.forEach((l, k) => {
    lv.appendChild(marked(levelBtn(l, 'btn btn-level', () => { cur.livello = l.livello; closePopup(); }, 'glevel-' + k), cur.livello === l.livello));
  });
  if (!state.livelli.length) lv.appendChild(emptyNote('livelli'));
  const pl = section('dlg-players', t('scegli_giocatore'));
  s.giocatori.forEach((p, i) => {
    const l = findLevel(p.livello);
    const b = button(playerName(i) + ' – ' + (l ? levelName(l) : ''), 'btn btn-player', () => { s.attivo = i; closePopup(); }, 'player-' + i);
    if (l && l.colore) b.style.background = l.colore;
    pl.appendChild(marked(b, a === i));
  });
  panel.appendChild(button(t('annulla'), 'btn btn-cancel', closePopup, 'annulla'));
  return dialogBack('giocatore', panel, t('tocca_a') + ' ' + playerName(a));
}

function exitPopup() {
  const panel = el('div', 'panel');
  const pair = el('div', 'pair');
  // setup is kept until [nuova_partita]
  pair.append(button(t('si'), 'btn btn-yes', () => { state.dialog = null; clearSave(); go('start'); }, 'esci-si'),
    button(t('annulla'), 'btn btn-cancel', closePopup, 'annulla'));
  panel.appendChild(pair);
  return dialogBack('esci', panel, t('conferma_esci'));
}

// Shown on the start screen when a valid save exists: one of the two buttons must be chosen (no Escape / backdrop close).
function resumePopup() {
  const panel = el('div', 'panel');
  const stack = el('div', 'stack');
  stack.append(button(t('continua'), 'btn btn-yes', resumeGame, 'continua'),
    button(t('nuova_partita'), 'btn btn-cancel', newGame, 'nuova-dlg'));
  panel.appendChild(stack);
  return dialogBack('riprendi', panel, t('partita_in_corso'), false);
}

function renderGioco(app) {
  app.appendChild(topField(true));
  app.appendChild(el('h2', 'scegli', t('scegli_categoria')));
  const grid = el('div', 'tiles');
  if (fadeGrid) { grid.classList.add('fade-in'); fadeGrid = false; }
  state.sfide.forEach((sf, i) => {
    const tile = button('', 'tile', () => openCard(sf, tile.getBoundingClientRect()), 'tile-' + i);
    tile.style.setProperty('--acc', sf.accento || CONFIG.defaults.accent);
    const name = el('span', 'tile-name', sf.sfida);
    name.lang = 'it';   // category names are Italian content
    tile.append(iconNode(sf, 'circle'), name);
    grid.appendChild(tile);
  });
  if (!state.sfide.length) grid.appendChild(emptyNote('sfide'));
  app.appendChild(grid);
  const bar = el('div', 'pair bottom');
  bar.append(button(t('esci'), 'btn btn-secondary', () => openDialog('esci', 'esci'), 'esci'),
    button(t('impostazioni'), 'btn btn-secondary', goSettings, 'impostazioni'));
  app.appendChild(bar);
  if (state.dialog === 'giocatore') app.appendChild(playerPopup());
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
  c.lang = 'it';   // card content (title, prompt, answer) is Italian; the UI buttons on the face override this (.card-actions)
  // per-category text style via CSS custom properties (no per-category CSS rules)
  const fam = sf.carattere ? '"' + sf.carattere.replace(/"/g, '') + '", var(--font-fallback)' : 'var(--font-fallback)';
  c.style.setProperty('--card-font', fam);
  if (sf.colore_testo) c.style.setProperty('--card-color', sf.colore_testo);
  c.style.setProperty('--card-align', { sinistra: 'left', centro: 'center', destra: 'right' }[sf.allineamento] || 'center');
  c.dataset.max = String(sf.dimensione || D.fontMax);
  c.style.setProperty('--card-fs', (sf.dimensione || D.fontMax) + 'px');
  c.style.setProperty('--acc', sf.accento || D.accent);
  // layout columns of sfide.csv, one geometry for template and CSS variant, front and back: text area margins
  // (fractions of the card height) and icon size (px of the 750x1050 template, scaled by --u)
  c.style.setProperty('--text-top', String((sf.textTop ?? D.textTop) / 100));
  c.style.setProperty('--text-bottom', String((sf.textBottom ?? D.textBottom) / 100));
  c.style.setProperty('--icon-size', String(sf.iconSize ?? D.iconSize));

  if (card && side === 'front' && card.immagine) {
    // a) full Canva card image as the front
    c.classList.add('card-image');
    const img = document.createElement('img');
    img.className = 'card-img';
    img.alt = card.testo || '';
    img.lang = 'it';
    img.src = CONFIG.dirs.carte + encodeURIComponent(card.immagine);
    img.addEventListener('error', () => { img.hidden = true; });
    c.appendChild(img);
    return c;
  }
  const tpl = !!(sf.sfondo && !sf.sfondoBroken);
  // App icon: always on the CSS variant (default bottom right); on a template ONLY if icona_posizione is set (the
  // template otherwise brings its own icon, decision D2). The icon-pos class also steers the pill arrangement.
  const pos = sf.iconPos || (tpl ? null : D.iconPos);
  if (pos) c.classList.add('icon-pos-' + pos);
  if (tpl) {
    // b) category template image: app draws only the text area content + pills (+ the icon if asked for)
    c.classList.add('card-tpl');
    c.style.backgroundImage = 'url("' + CONFIG.dirs.sfondi + encodeURIComponent(sf.sfondo) + '")';
    if (pos) c.appendChild(iconNode(sf, 'circle card-icon icon-box'));
  } else {
    // c) CSS variant: tricolore frame (::before), centred title, icon circle
    c.append(iconNode(sf, 'circle card-icon icon-box'), titleNode(sf));
  }
  const body = el('div', 'card-body');
  const pr = el('div', 'card-prompt');
  pr.appendChild(el('span', 'card-text', !card ? t('nessuna_carta') : side === 'front' ? card.testo : card.risposta));
  body.appendChild(pr);
  c.appendChild(body);
  return c;
}

/* ---- Hilfe (multiple choice). State in state.card.hilfe = { order:[option idx], picked:idx|null, hidden:bool };
   option 0 is the correct one (first in the CSV), order is the shuffled display order. ---- */
function renderOpts(face, card, cs = state.card) {
  const old = face.querySelector('.card-opts');
  if (old) old.remove();
  const h = cs.hilfe;
  if (!h || h.hidden) return null;   // hidden: the options are not drawn (order and a locked pick stay in the state)
  const box = el('div', 'card-opts');
  box.setAttribute('role', 'group');
  box.setAttribute('aria-label', t('aiuto'));
  // polite live region (created once with the box, filled on the pick): announces the result
  const live = el('div', 'sr-only');
  live.setAttribute('role', 'status');
  live.setAttribute('aria-live', 'polite');
  const btns = h.order.map((i, pos) => {
    const b = button('', 'card-opt', () => {
      if (h.picked != null) return;
      h.picked = i;
      paint();
      live.textContent = i === 0 ? t('giusto') : t('sbagliato') + '. ' + t('giusto') + ': ' + card.opzioni[0];
      fitCard();
      saveGame();
    }, 'opt-' + pos);
    const tx = el('span', 'opt-text', card.opzioni[i]);
    tx.lang = 'it';
    b.appendChild(tx);
    box.appendChild(b);
    return b;
  });
  // After a pick: the correct option shows a check, a wrongly tapped one a cross (glyphs aria-hidden, a visually
  // hidden word says the same). The options stay focusable (aria-disabled, not disabled) so the focus is not lost.
  function paint() {
    btns.forEach((b, pos) => {
      const i = h.order[pos];
      b.querySelectorAll('.glyph, .sr-only').forEach(n => n.remove());
      b.classList.remove('right', 'wrong', 'dim');
      if (h.picked == null) return;
      b.setAttribute('aria-disabled', 'true');
      let key = null;
      if (i === 0) { b.classList.add('right'); key = 'giusto'; }
      else if (i === h.picked) { b.classList.add('wrong'); key = 'sbagliato'; }
      else b.classList.add('dim');
      if (key) {
        const g = el('span', 'glyph', key === 'giusto' ? '✓' : '✗');
        g.setAttribute('aria-hidden', 'true');
        b.prepend(g);
        b.appendChild(el('span', 'sr-only', ', ' + t(key)));
      }
    });
  }
  paint();
  box.appendChild(live);
  (face.querySelector('.card-body') || face).appendChild(box);
  return box;
}

/* cs = the card's view state (flip, Hilfe, features): state.card in the game, a throw-away object in the preview.
   preview = true: static card (pills inert, no swipe, back not clickable), the caller decides front/back and Hilfe. */
function buildCard(sf, card, cs = state.card, preview = false) {
  const flip = el('div', 'card-flip');
  if (!card) {
    flip.appendChild(buildFace(sf, null, 'front'));
    return flip;
  }
  const front = buildFace(sf, card, 'front');
  flip.appendChild(front);

  const acts = el('div', 'card-actions');
  if (card.risposta) {
    const b = button(t('soluzione'), 'card-btn btn-soluzione', () => setFlipped(flip, sf, card, true, true, cs), 'soluzione');
    acts.appendChild(b);
  }
  acts.lang = state.lang;   // the pills are UI text, not Italian card content
  front.appendChild(acts);
  // Hilfe pill: [aiuto] while the options are not shown, [nascondi] while they are. Hiding keeps order and a locked pick.
  let pill = null;
  const syncHilfe = refocus => {
    if (pill) pill.remove();
    const shown = !!cs.hilfe && !cs.hilfe.hidden;
    pill = button(shown ? t('nascondi') : t('aiuto'), 'card-btn btn-aiuto', () => {
      if (!cs.hilfe) cs.hilfe = { order: shuffle([0, 1, 2]), picked: null, hidden: false };
      else cs.hilfe.hidden = !cs.hilfe.hidden;
      syncHilfe(true);
      fitCard();
      saveGame();
    }, shown ? 'nascondi' : 'aiuto');
    acts.prepend(pill);
    renderOpts(front, card, cs);   // also restores Hilfe after a re-render (e.g. language switch)
    if (refocus) focusFid(shown ? 'opt-0' : 'aiuto');   // the pill that had the focus is gone
  };
  if (card.opzioni.length === 3) syncHilfe(false);
  if (preview) acts.querySelectorAll('button').forEach(b => { b.disabled = true; });   // preview: the pills only show where they sit

  if (preview) {
    if (cs.flipped) setFlipped(flip, sf, card, true, false, cs);   // preview back: also for cards without risposta (shows the back template)
  } else if (card.risposta) {
    attachSwipe(flip, () => setFlipped(flip, sf, card, !cs.flipped, true, cs));
    if (cs.flipped) setFlipped(flip, sf, card, true, false, cs);
  }
  return flip;
}

// Back face is built on the first flip. Front tap never flips; back tap flips back.
// Focus: [soluzione] moves it to the back face (so a screen reader reads the answer), flipping back returns it to [soluzione].
function setFlipped(flip, sf, card, on, moveFocus = true, cs = state.card) {
  const front = flip.querySelector('.card-front');
  let back = flip.querySelector('.card-back');
  if (on && !back) {
    back = buildFace(sf, card, 'back');
    if (!cs.preview) {   // the preview back is static
      back.setAttribute('role', 'button');
      back.tabIndex = 0;
      back.dataset.fid = 'back';
      back.addEventListener('click', () => setFlipped(flip, sf, card, false, true, cs));
      back.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFlipped(flip, sf, card, false, true, cs); }
      });
    }
    flip.appendChild(back);
    fitCard();
  }
  cs.flipped = on;
  flip.classList.toggle('flipped', on);
  front.inert = on;
  if (back) back.inert = !on;
  if (moveFocus) {
    const target = on ? back : flip.querySelector('.btn-soluzione');
    if (target) target.focus({ preventScroll: true });
  }
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
   Entry: { name, applies(card, sfida) -> bool, render(ctx) -> cleanup fn | undefined, preview: false = skipped in the preview }
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
  preview: false,   // the preview is static: no countdown
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
    }, 'timer');
    box.append(disp, btn, msg);
    let iv = setInterval(tick, 250);

    function remaining() {
      return st.startedAt == null ? st.left : Math.max(0, st.left - (Date.now() - st.startedAt));
    }
    const fmt = ms => { const s = Math.ceil(ms / 1000); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
    function paint() {
      disp.textContent = fmt(remaining());
      if (st.done && document.activeElement === btn) { box.tabIndex = -1; box.focus({ preventScroll: true }); }   // the button is about to hide
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
      m.lang = state.lang;
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

// Runs the CARD_FEATURES that apply to the card (the game's card screen and the preview share this).
function runFeatures(card, sf, flip, below, cs, preview) {
  const body = flip.querySelector('.card-front .card-body') || flip.querySelector('.card-front');
  CARD_FEATURES.forEach(f => {
    try {
      if ((preview && f.preview === false) || !f.applies(card, sf)) return;
      const store = (cs.fx[f.name] = cs.fx[f.name] || {});
      const cleanup = f.render({ card, sfida: sf, front: body, below, store, refit: fitCard });
      if (typeof cleanup === 'function') cardCleanups.push(cleanup);
    } catch (e) { console.error(e); }
  });
}

// Screen readers: [altra_carta] re-renders the card screen, so the new card is announced through a polite live region
// that lives outside #app (it survives the re-render). Cleared first, so an identical text is read again. Never moves focus.
let liveTimer = null;
function liveRegion() {
  let live = document.getElementById('card-live');
  if (!live) {
    live = el('div', 'sr-only');
    live.id = 'card-live';
    live.setAttribute('role', 'status');
    live.setAttribute('aria-live', 'polite');
    document.body.appendChild(live);
  }
  return live;
}
function announce(text, lang) {
  const live = liveRegion();
  clearTimeout(liveTimer);
  live.textContent = '';
  live.lang = lang;
  liveTimer = setTimeout(() => { live.textContent = text; }, CONFIG.defaults.liveDelayMs);
}

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
    runFeatures(card, sf, flip, below, state.card, false);
    if (below.children.length) app.appendChild(below);
  }
  const bar = el('div', 'pair bottom');
  const more = button(t('altra_carta'), 'btn', () => {
    if (Date.now() - lastDrawAt < CONFIG.defaults.doubleTapMs) return;
    state.card = newCardState(sf);
    fadeCard = true;
    render();
    const c = state.card.idx != null ? state.carte[state.card.idx] : null;
    if (c) announce(c.testo || sf.sfida, 'it');   // card content is Italian
    else announce(t('nessuna_carta'), state.lang);
  }, 'altra');
  more.disabled = !card;
  bar.append(button(t('chiudi'), 'btn btn-secondary', () => {
    state.setup.attivo = (state.setup.attivo + 1) % state.setup.giocatori.length;   // closing a card passes the turn
    fadeGrid = true;
    go('gioco');
  }, 'chiudi'), more);
  app.appendChild(bar);
  fitCard();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitCard);
}

/* ==========================================================================
   PREVIEW - index.html?anteprima: one card per category side by side, for Chiara to check her Canva templates and the
   layout columns of sfide.csv. Same validation, banner, fonts, buildFace/buildCard as the game; the cards are static
   (no swipe / flip / timer; the Hilfe options stay clickable). It never touches state.card or the game state and
   writes nothing to localStorage except the language.
   ========================================================================== */
const pv = { size: CONFIG.previewDefaultSize, aiuto: false, retro: false, area: false };

// The card shown for a category: the one with the LONGEST testo (any level) = the worst case for the text fit.
function worstCard(sf) {
  let best = null;
  state.carte.forEach(c => {
    if (c.sfida === sf.sfida && (!best || (c.testo || '').length > (best.testo || '').length)) best = c;
  });
  return best;
}

// Dashed outline of the text area + dotted outline of the app-icon box (where the app icon would go), so a Canva
// template can be lined up. Same custom properties as the face, so it follows the margins / icon columns exactly.
function areaOverlay(face) {
  const ov = el('div', 'pv-overlay ' + ([...face.classList].find(c => c.startsWith('icon-pos-')) || 'icon-pos-' + CONFIG.defaults.iconPos));
  ov.setAttribute('aria-hidden', 'true');
  ov.append(el('div', 'pv-area'), el('div', 'pv-icon-box icon-box'));
  face.appendChild(ov);
}

// Caption: the CSV column names literally (Chiara knows them) + the value set, or "standard (<default>)".
function previewCaption(sf, card) {
  const D = CONFIG.defaults;
  const cap = el('figcaption', 'pv-cap');
  const name = el('h2', 'pv-name', sf.sfida);
  name.lang = 'it';
  const dl = el('dl', 'pv-info');
  const row = (k, v) => dl.append(el('dt', null, k), el('dd', null, v));
  const std = v => t('anteprima_standard', { valore: v });
  const tpl = !!(sf.sfondo && !sf.sfondoBroken);
  row('livelli', card ? card.livelli.map(id => { const l = findLevel(id); return l ? levelName(l) : id; }).join(', ') : '—');
  row('sfondo', sf.sfondo || '—');
  row('icona_posizione', sf.iconPos || (tpl ? t('anteprima_standard_modello') : std(D.iconPos)));
  row('icona_dimensione', sf.iconSize != null ? sf.icona_dimensione : std(D.iconSize));
  row('testo_margine_alto', sf.textTop != null ? sf.testo_margine_alto : std(D.textTop));
  row('testo_margine_basso', sf.textBottom != null ? sf.testo_margine_basso : std(D.textBottom));
  cap.append(name, dl);
  return cap;
}

function renderAnteprima(app) {
  const link = el('a', 'pv-back', t('torna_al_gioco'));
  link.href = location.pathname;   // the game: same page without ?anteprima
  link.dataset.fid = 'pv-back';
  app.querySelector('.topbar').prepend(link);
  app.appendChild(el('h1', 'pv-title', t('anteprima_titolo')));

  const ctl = el('div', 'pv-controls');
  const toggle = (key, labelKey) => {
    const b = button(t(labelKey), 'pv-btn', () => { pv[key] = !pv[key]; render(); }, 'pv-' + key);
    b.setAttribute('aria-pressed', String(pv[key]));
    return b;
  };
  const sizes = el('div', 'pv-sizes');
  sizes.setAttribute('role', 'group');
  sizes.setAttribute('aria-label', t('anteprima_dimensione'));
  sizes.appendChild(el('span', 'pv-label', t('anteprima_dimensione')));
  CONFIG.previewSizes.forEach(z => {
    const b = button(t(z.key) + ' ' + z.h + 'px', 'pv-btn', () => { pv.size = z.key; render(); }, 'pv-size-' + z.h);
    b.setAttribute('aria-pressed', String(pv.size === z.key));
    sizes.appendChild(b);
  });
  ctl.append(sizes, toggle('aiuto', 'anteprima_aiuto'), toggle('retro', 'anteprima_retro'), toggle('area', 'anteprima_area'));
  app.appendChild(ctl);

  const size = CONFIG.previewSizes.find(z => z.key === pv.size) || CONFIG.previewSizes[0];
  const grid = el('div', 'pv-grid');
  grid.style.setProperty('--card-h-fixed', size.h + 'px');
  state.sfide.forEach(sf => {
    const card = worstCard(sf);
    const cs = {
      sfida: sf.sfida, idx: null, flipped: pv.retro && !!card, fx: {}, preview: true,
      hilfe: pv.aiuto && card && card.opzioni.length === 3 ? { order: [0, 1, 2], picked: null } : null   // fixed order: the correct one first
    };
    const item = el('figure', 'pv-item');
    const wrap = el('div', 'card-wrap');
    const flip = buildCard(sf, card, cs, true);
    wrap.appendChild(flip);
    const stage = el('div', 'pv-stage');
    stage.appendChild(wrap);
    item.append(stage, previewCaption(sf, card));
    grid.appendChild(item);
    if (card) runFeatures(card, sf, flip, el('div'), cs, true);
    if (pv.area) flip.querySelectorAll('.card:not(.card-image)').forEach(areaOverlay);
  });
  if (!state.sfide.length) grid.appendChild(emptyNote('sfide'));
  app.appendChild(grid);
  fitCard();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitCard);
}

const SCREENS = {
  start: renderStart, stesso: renderStesso, livello: renderLivello,
  quanti: renderQuanti, giocatori: renderGiocatori, gioco: renderGioco, carta: renderCarta,
  anteprima: renderAnteprima
};

/* ---- Focus management ----
   Same screen, same dialog: the focus goes back to the control (data-fid) that had it. New screen: it moves to the
   screen's main element (heading / .question / top field / card front, made focusable with tabindex=-1). Dialog
   open: first button; dialog closed: the opener. The focus never ends on <body> after an action. ---- */
const focusFid = fid => {
  const e = fid && document.querySelector('[data-fid="' + fid + '"]');
  if (!e) return false;
  e.focus({ preventScroll: true });
  return document.activeElement === e;
};
const MAIN_FOCUS = {
  start: '.start h1', stesso: '.question', livello: '.question', quanti: '.question',
  giocatori: '.rows', gioco: '.topfield', carta: '.card-front', anteprima: '.pv-title'
};
function focusMain() {
  const e = document.querySelector('#app ' + (MAIN_FOCUS[state.screen] || 'h1'));
  if (!e) return;
  if (e.tabIndex < 0) e.tabIndex = -1;
  e.focus({ preventScroll: true });
}
let view = { screen: null, dlg: '' };   // what the last render() showed

function render() {
  runCleanups();   // card features (timer, audio...) are torn down on every re-render / screen change
  const app = document.getElementById('app');
  const act = document.activeElement;
  const hadFocus = !!(act && act !== document.body && (app.contains(act) || document.getElementById('banner').contains(act)));
  const fid = hadFocus ? act.dataset.fid : null;
  app.textContent = '';
  const bar = el('header', 'topbar');
  bar.appendChild(langBox());
  app.appendChild(bar);
  (SCREENS[state.screen] || renderStart)(app);
  document.body.className = 'screen-' + state.screen;   // after the screen ran: renderCarta may fall back to 'gioco'
  renderBanner();
  const back = app.querySelector('.backdrop');
  const dlg = back ? back.dataset.dlg : '';
  setInertOutside(back);
  if (state.screen !== view.screen) {
    if (back) { const first = back.querySelector('button'); if (first) first.focus({ preventScroll: true }); }   // resume dialog on page load
    else if (view.screen !== null) focusMain();   // not on the very first render: do not steal the focus on page load
  } else if (dlg !== view.dlg) {
    if (back) { const first = back.querySelector('button'); if (first) first.focus({ preventScroll: true }); }
    else if (!focusFid(dialogOpener)) focusMain();
  } else if (hadFocus && !(fid && focusFid(fid))) {
    focusMain();
  }
  view = { screen: state.screen, dlg };
  saveGame();
}

// While a dialog is open everything outside its backdrop is inert (no focus, no clicks, hidden from screen readers).
function setInertOutside(back) {
  const app = document.getElementById('app');
  [...app.children].forEach(c => { c.inert = !!back && c !== back; });
  document.getElementById('banner').inert = !!back;
}

document.addEventListener('keydown', e => {
  const dlgOpen = state.popup != null || state.dialog;
  if (e.key === 'Escape' && dlgOpen) { if (state.dialog !== 'riprendi') closePopup(); }
  else if (e.key === 'Tab' && dlgOpen) {   // keep Tab / Shift+Tab inside the dialog panel
    const panel = document.querySelector('.panel');
    if (!panel) return;
    const items = [...panel.querySelectorAll('button:not([disabled])')];
    if (!items.length) return;
    const i = items.indexOf(document.activeElement);
    if (i < 0) { e.preventDefault(); items[e.shiftKey ? items.length - 1 : 0].focus(); }
    else if (e.shiftKey && i === 0) { e.preventDefault(); items[items.length - 1].focus(); }
    else if (!e.shiftKey && i === items.length - 1) { e.preventDefault(); items[0].focus(); }
  }
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
        if (state.screen === 'anteprima' || (state.screen === 'carta' && state.card && state.card.sfida === sf.sfida)) render();   // card already on screen
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
  liveRegion();
  if (new URLSearchParams(location.search).has('anteprima')) state.screen = 'anteprima';   // index.html?anteprima (also ?anteprima=1): never reads or writes the save
  else {
    pendingSave = loadSave();
    if (pendingSave) state.dialog = 'riprendi';   // start screen + resume dialog
  }
  render();
  preloadAssets();
  await loadFonts();
  fitCard();   // custom fonts are in: re-fit a card that is already on screen
  renderBanner();
  await checkFiles();
}

init().catch(e => { console.error(e); });
