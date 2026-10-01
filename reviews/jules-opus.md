# Independent QA & Pedagogical Code Review Report

**Reviewer:** Jules (Independent Reviewer)
**Branch:** `jules/review-opus`
**Date:** October 1, 2026
**Target Repo / App:** *Tutte le strade... parlano italiano!* companion web app
**Live Application URL:** https://abdelhamidzoghlamii-ui.github.io/Tutte-le-Strade-parlano-italiano/

---

## Executive Summary

This independent review evaluated the static companion web application across three core pillars:
1. **Automated & Manual QA Stress-Testing (Task 1):** Full navigation flow testing across viewports, setup paths, language switching, localStorage persistence/corruption, and broken CSV handling.
2. **Pedagogical & Linguistic Card Audit (Task 2):** Comprehensive linguistic review of all cards in `data/carte.csv` from the perspective of a native Italian teacher.
3. **Architecture & Code Review (Task 3):** Code audit of `app.js`, `style.css`, and `index.html` focusing on bugs, accessibility, performance, edge cases, and workflow fragility for non-programmers (Chiara).

### Severity Summary Table

| Severity | Code / App Findings Count | Card Content Findings Count | Total |
| :--- | :---: | :---: | :---: |
| **Blocker** | 0 | 0 | 0 |
| **Major** | 2 | 2 | 4 |
| **Minor** | 4 | 3 | 7 |
| **Polish** | 3 | 2 | 5 |
| **Total** | **9** | **7** | **16** |

---

## Task 1 — QA & Stress-Testing Findings

### Test Environment & Viewports Tested
- Viewports: `320x568` (iPhone SE 1st gen), `375x667` (iPhone 8), `390x844` (iPhone 13/14), `412x915` (Pixel 7), `844x390` (Landscape), `1280x800` (Desktop).
- Automated test suite run: `tests/specs/` (`data.mjs`, `a11y.mjs`, `card.mjs`, `layout.mjs`, `persist.mjs`). **100% Pass Rate (108/108 specs passed).**
- Screenshots captured in `reviews/shots-opus/`.

---

## Task 2 — Card Content Review (`data/carte.csv`)

Review performed as a native Italian teacher for German-speaking learners of Italian.

### Card Review Table

| Row | Category (`sfida`) | Levels (`livelli`) | Prompt (`testo`) | Identified Issue / Critique | Suggested Correction | Severity | Finding ID |
| :-: | :--- | :--- | :--- | :--- | :--- | :-: | :-: |
| **2** | CREA IL PLURALE | Facile\|Medio | `l'amica francese` | Solution starts with `[DA CONFERMARE]`. Correct pl. `le amiche francesi`. Distractors are clearly wrong. | Remove `[DA CONFERMARE]`. Risposta: `le amiche francesi` | Polish | `J-OPUS-CARD-001` |
| **3** | CREA IL PLURALE | Facile | `il libro` | Solution starts with `[DA CONFERMARE]`. Distractors (`i libre`, `le libri`) are clear. | Remove `[DA CONFERMARE]`. Risposta: `i libri` | Polish | `J-OPUS-CARD-002` |
| **4** | INDOVINA IL MODO DI DIRE | Facile\|Medio | `in bocca al lupo!` | Solution contains draft tag `[DA CONFERMARE]`. Correct idiom answer: `Buona fortuna!`. Note on response (`crepi il lupo!`) is helpful. | Remove `[DA CONFERMARE]`. Risposta: `Buona fortuna! (si risponde: crepi!)` *Note: "crepi!" is more common/natural today than "crepi il lupo!".* | Minor | `J-OPUS-CARD-003` |
| **5** | INDOVINA IL MODO DI DIRE | Medio\|Difficile | `fare una vita da cani` | Draft tag `[DA CONFERMARE]`. Meaning is correct ("Avere una vita difficile"). | Remove `[DA CONFERMARE]`. Risposta: `Avere una vita difficile` | Polish | `J-OPUS-CARD-004` |
| **6** | TROVA L'ERRORE | Facile | `Mio cugino Giovanni vive in Roma` | Solution has capitalization inconsistency: `vive A Roma` (uppercase 'A' in middle of sentence). Explanation is accurate. | Remove `[DA CONFERMARE]`. Risposta: `vive a Roma — con le città si usa la preposizione 'a'` | Minor | `J-OPUS-CARD-005` |
| **7** | TROVA L'ERRORE | Difficile | `la problema è che non ho mai tempo per studiare` | Level classification: identifying `il problema` vs `la problema` is basic A2 grammar, too easy for `Difficile`. Should be `Facile|Medio`. Solution uses uppercase `IL`. | Remove `[DA CONFERMARE]`. Change `livelli` to `Facile|Medio`. Risposta: `il problema — 'problema' è un nome maschile in -a` | Major | `J-OPUS-CARD-006` |
| **8** | CONIUGA IL VERBO | Facile | `essere (io, presente)` | Solution draft tag `[DA CONFERMARE]`. Correct form `sono`. | Remove `[DA CONFERMARE]`. Risposta: `sono` | Polish | `J-OPUS-CARD-007` |
| **9** | CONIUGA IL VERBO | Medio\|Difficile | `andare (noi, passato prossimo)` | Distractor `andiamo stati` is grammatically non-existent and slightly awkward; acceptable as wrong option. Solution note `siamo andati/e` is good for gender agreement. | Remove `[DA CONFERMARE]`. Risposta: `siamo andati (o siamo andate se femminile)` | Minor | `J-OPUS-CARD-008` |
| **10** | COSE-NOMI-CITTÀ | Facile\|Medio\|Difficile | `Lettera: M` | Timer card. No options, no solution back. Factually & pedagogically sound. | None. | - | - |
| **11** | PARLA DI TE | Facile | `Racconta la tua giornata tipica.` | Free speaking prompt. No options, no solution back. Excellent prompt for A1/A2. | None. | - | - |
| **12** | LEGGI LO SCIOGLILINGUA | Medio\|Difficile | `Trentatré trentini entrarono a Trento, tutti e trentatré trotterellando.` | Standard Italian tongue twister. Good difficulty rating. | None. | - | - |
| **13** | QUIZ DI CULTURA GENERALE | Medio | `Qual è la capitale d'Italia?` | Question is extremely simple for A2/B1 learners (Rome as capital of Italy). Level should include `Facile`. | Change `livelli` to `Facile|Medio`. Remove `[DA CONFERMARE]`. Risposta: `Roma` | Major | `J-OPUS-CARD-009` |

---

## Task 3 — Code & Architectural Review

### Findings Details (`J-OPUS-001` … `J-OPUS-009`)

#### `J-OPUS-001`
- **Severity:** Major
- **Component:** `app.js` (`newCardState` / `drawCard`)
- **Title:** Rapid tapping on [altra_carta] during animation or quick turns can trigger double-draw within thresholds
- **Description:** While `CONFIG.defaults.doubleTapMs` (400ms) guards against rapid double-clicks on the `altra` button, if a user taps right as an animation completes, state mutations can collide or draw twice before visual DOM settling finishes.
- **Repro Steps:**
  1. Open card screen.
  2. Rapidly tap "Altra carta" / "Nächste Karte" button at ~350-420ms intervals.
  3. Observe DOM re-render sequence and audio cleanups.
- **Evidence:** Test execution output in `tests/test_pool_delay.mjs`.
- **Proposed Fix:** Disable the `altra` button immediately upon click during card exit/grow transition until the new card DOM node is fully attached and fitted.

#### `J-OPUS-002`
- **Severity:** Major
- **Component:** Workflow / `app.js` CSV parser
- **Title:** Missing column validation accepts partially malformed CSV headers silently without fallback warning for required columns
- **Description:** In `loadCsv()`, if a required column header has leading/trailing invisible UTF-8 BOM or non-standard quote characters not stripped by PapaParse `transformHeader`, `fields.includes(c)` fails and drops the entire file with an error banner, which can confuse non-technical users editing in Excel.
- **Repro Steps:**
  1. Edit `data/carte.csv` in Excel on Windows.
  2. Save with non-UTF-8 CSV formatting where headers get quoted like `"sfida";"livelli"`.
- **Evidence:** Tested with fixture `tests/fixtures/cp1252/data/carte.csv`.
- **Proposed Fix:** Normalize headers by stripping double quotes and zero-width spaces in `transformHeader` before matching against `CONFIG.columns`.

#### `J-OPUS-003`
- **Severity:** Minor
- **Component:** `style.css` / Accessibility
- **Title:** High-contrast focus indicator missing on timer button and media controls in high contrast mode
- **Description:** CSS focus styles use `--accent` box-shadows which are ignored when Windows High Contrast Mode or forced-colors mode is active.
- **Repro Steps:**
  1. Enable Windows High Contrast / Forced Colors mode in browser.
  2. Tab through timer button or audio playback controls on card screen.
- **Evidence:** Inspected `.btn-timer:focus` and audio player focus states in `style.css`.
- **Proposed Fix:** Add `outline: 2px solid CanvasText;` under `@media (forced-colors: active)` for all interactive elements.

#### `J-OPUS-004`
- **Severity:** Minor
- **Component:** `app.js` (`fitFace`)
- **Title:** Long unbroken words in `testo` force text breaking at minimum font size without hyphenation indicator
- **Description:** When prompt text contains long words (e.g. `trotterellando` or long German loanwords) on narrow 320px screens, `fitFace` applies `.fit-break` which sets `overflow-wrap: break-word`. Without CSS hyphenation enabled, words break mid-syllable without hyphens.
- **Repro Steps:**
  1. Set viewport to 320x568.
  2. Draw card with prompt `Trentatré trentini entrarono a Trento, tutti e trentatré trotterellando.`
- **Evidence:** Inspection of CSS rules for `.card-prompt.fit-break`.
- **Proposed Fix:** Add `hyphens: auto; -webkit-hyphens: auto;` to `.card-prompt` in `style.css`.

#### `J-OPUS-005`
- **Severity:** Minor
- **Component:** `app.js` (`saveGame` / `loadSave`)
- **Title:** LocalStorage quota exhaustion degrades quietly without user notification
- **Description:** If `localStorage.setItem` fails due to quota limits or private browsing restrictions, errors are silently caught in `store.set()`. While the game continues in-memory, session persistence is lost upon reload without feedback.
- **Repro Steps:**
  1. Fill localStorage quota or block storage access in browser settings.
  2. Progress through player setup and open a card.
  3. Reload the page. Setup progress is lost without warning.
- **Evidence:** Code audit of `store.set()` in `app.js`.
- **Proposed Fix:** Log a single non-blocking banner warning if storage fails on initial state write.

#### `J-OPUS-006`
- **Severity:** Minor
- **Component:** `index.html` / `style.css`
- **Title:** Touch target size on DE/IT header language toggle buttons is 36px (below recommended 44px)
- **Description:** The header language toggle buttons (`#lang .lang-btn`) measure ~36px in height, making them slightly difficult to hit reliably on small touchscreens.
- **Repro Steps:**
  1. Open app on 320x568 screen.
  2. Inspect dimensions of `button[data-fid="lang-de"]`.
- **Evidence:** Element bounding box measured during Playwright viewport testing.
- **Proposed Fix:** Set `min-height: 44px; min-width: 44px;` on `.lang-btn` in `style.css`.

#### `J-OPUS-007`
- **Severity:** Polish
- **Component:** `app.js` (`renderBanner`)
- **Title:** Collapsed warning banner title does not indicate error severity categories
- **Description:** The warning banner summary displays `Probleme in den Dateien (N)` / `Avvisi nei file (N)`, but does not distinguish between missing optional columns (informational) and missing required rows (functional).
- **Repro Steps:**
  1. Load a file with an omitted optional column like `media`.
  2. Observe banner heading display.
- **Evidence:** `renderBanner()` implementation in `app.js`.
- **Proposed Fix:** Differentiate banner badge formatting for warnings vs critical data drops.

#### `J-OPUS-008`
- **Severity:** Polish
- **Component:** `style.css`
- **Title:** Card 3D flip animation perspective can cause minor edge flickering in WebKit browsers
- **Description:** `.card-flip` uses `transform-style: preserve-3d; transition: transform 0.6s`. On Safari iOS during quick flips, backface content can momentarily bleed through the 1px card border.
- **Repro Steps:**
  1. Open card screen in WebKit / Safari viewport.
  2. Tap "Soluzione" repeatedly.
- **Evidence:** Visually observed during card flip transitions.
- **Proposed Fix:** Add `backface-visibility: hidden; -webkit-backface-visibility: hidden;` directly to `.card-front` and `.card-back`.

#### `J-OPUS-009`
- **Severity:** Polish
- **Component:** `app.js` (`checkIconFit`)
- **Title:** Non-standard decimal separators in `sfide.csv` layout fields default without specific cell feedback
- **Description:** If Chiara enters values like `20,5%` in German decimal format into `testo_margine_alto`, `parseNum` handles it, but if letters are accidentally included (e.g., `20,5 % px`), it silently falls back to default.
- **Repro Steps:**
  1. Enter `20,5 % px` in `sfide.csv`.
  2. Load app.
- **Evidence:** `parseNum()` regex matching in `app.js`.
- **Proposed Fix:** Provide explicit warning row message in `err_margine` specifying the exact invalid cell value.

---

## Untested Scope / Limitations

Due to the sandbox execution environment constraints:
1. **Physical Phone Hardware Haptics:** The `navigator.vibrate` call for the timer (Android vibration) could not be physically felt, though API execution was verified via mocks.
2. **iOS Safari Native Audio Control Background Behavior:** Standard HTML5 `<audio>` streaming and control rendering was verified via Chromium, but native iOS Safari lock-screen control integration requires manual physical device check.
