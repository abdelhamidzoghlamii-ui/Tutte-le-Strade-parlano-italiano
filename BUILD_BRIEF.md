# Build Brief — "Tutte le strade... parlano italiano!" companion web app

Product spec. Build to match. Workflow rules are in CLAUDE.md. The hand-drawn UX sketch is
`docs/skizze-app.pdf` — it is the source of truth for flow and layout; look at it.

## 1. What this is
Companion web app for a physical Italian-learning board game. Real board, real die. When a player
lands on a challenge square, they tap the matching category, read the card, answer aloud, then flip
the card to see the solution. The app is a **card dispenser + answer key**. NO dice, turns, scoring,
or board position.

## 2. Hard requirements
- **Static site, NO build step.** Plain HTML + CSS + vanilla JS. No React/Vite/npm build. Deploys to
  GitHub Pages as-is. Editing a CSV or dropping in an image is the only thing needed to change content.
- **All content and UI text lives in CSV + asset files.** Nothing hardcoded in JS.
- **CSV: semicolon `;` is the standard delimiter** (German Excel). Parse with PapaParse (vendored, no
  build) with **delimiter auto-detection** so `,` files also work. Handle quotes, apostrophes, blanks,
  a UTF-8 BOM, and Windows line endings.
- **Multi-value fields use `|`** (e.g. `Facile|Medio`). Trim whitespace around each value.
- **UTF-8 everywhere**; accents (à è é ì ò ù) and umlauts (ä ö ü) must render.
- **Mobile-first** (players scan a QR and use phones), works on desktop too.
- **Fully offline** once loaded; bundle fonts locally.

## 3. Screen flow (see sketch pages 1–5)
1. **Start** — title + button [nuova_partita]. Language switch DE/IT visible (see §5).
2. **Same level?** — [stesso_livello] with [si] / [no].
3A. **If Sì → group level** — [quale_livello], one button per level from livelli.csv, colored with
    the level's `colore`. → Game (group mode).
3B1. **If No → player count** — [quanti_giocatori], buttons 1–6.
3B2. **Players** — N rows: a free-text name field (default "Giocatore 1"…) + a level field. Tapping
    the level field opens a popup listing the levels. [inizia] → Game (player mode).
4. **Game — category grid**
   - Top field: group mode → shows "LIVELLO – MEDIO" (level name in current UI language).
     Player mode → a clickable field showing the active player (name + level); tap → popup to choose
     the active player.
   - [scegli_categoria] + a 2-column grid of category tiles from sfide.csv (icon + name).
   - Bottom: [esci] (back to start, confirm first) and [impostazioni] (back to setup, keeping the
     entered names/levels).
5. **Card** (sketch page 4)
   - Tapping a tile draws a random card for that category whose `livelli` includes the current level
     (group level, or the active player's level). Animation: the card grows from the tile to full
     size; the grid disappears.
   - Must look like a real physical card. **Front:** standard header (category icon left, category
     title, tricolore stripe in Italian colors), then the prompt in the middle. Bottom-left [aiuto],
     bottom-right [soluzione].
   - **[aiuto]** reveals the card's 3 `opzioni` as multiple-choice buttons under the prompt. Tapping one
     marks it right/wrong (right = matches the correct option, see §6). Hide [aiuto] if no `opzioni`.
   - **[soluzione]** or a **horizontal swipe** flips the card (3D flip animation). **Back:** the
     `risposta`. Tap/swipe again flips back. Hide [soluzione] and disable swipe if `risposta` is blank.
   - Controls: [chiudi] → back to grid; [altra_carta] → new card, same category.
   - No card for this level → friendly [nessuna_carta]; no crash.
   - Don't repeat a card until every matching card in that category has been shown (per session).
6. **Per-category features** (driven by data, not hardcoded per category name):
   - `timer` set in sfide.csv (seconds) → the card shows a visible countdown with start/pause and a
     clear "time's up" signal (e.g. COSE-NOMI-CITTÀ).
   - `media` set on a card → show the image, or an audio player for audio files (e.g. QUIZ DI CULTURA).
   The design must make adding a future per-category feature a small, isolated change.

## 4. Card design comes from Canva — one template per category
Chiara designs ONE template per category in Canva; all cards of that category share it.
- `sfondo` set in sfide.csv → use that image as the card face; the app draws ONLY the prompt text
  (and buttons) on top — the template already contains the header/stripe design.
- `sfondo` empty → the app draws the standard header (icon, title, tricolore stripe) in CSS.
- Text is styled per category from sfide.csv (`carattere`, `dimensione`, `colore_testo`,
  `allineamento`). No global text style.
- **Optional override:** `immagine` set on a card → show that full Canva-made card image as the front
  instead of rendering text.
- `icona`: an emoji OR an image filename in assets/icone/ (detect by file extension).
- Back of card: same template (or plain cream card) with the `risposta` text.
Keep all card styling in ONE commented CSS block, easy to adjust from a Canva screenshot.

## 5. Language (DE / IT switchable)
- All UI strings come from `data/testi_ui.csv` (`chiave;de;it`). Button labels in §3 are keys.
- A DE/IT toggle, reachable on the start screen and in the game screen; remember the choice in
  localStorage (try/catch; default DE).
- Level names: `livello` (IT) or `nome_de` (DE) per current language.
- Card content (categories, prompts, answers) is always Italian — it's the learning material.

## 6. Data files (`data/`, all `;`-separated, keys match exactly)
### carte.csv — the cards (edited most)
`sfida;livelli;testo;opzioni;media;immagine;risposta`
- sfida → must match sfide.csv. livelli → one or more levels from livelli.csv, `|`-separated.
- testo → prompt text. opzioni → exactly 3 answers `|`-separated, optional; the **correct option is
  the one listed first** in the CSV — the app shuffles display order.
- media → optional image/audio filename in assets/media/. immagine → optional full-card image in
  assets/carte/. risposta → answer on the back; may be blank.
- `[DA CONFERMARE]` in text = placeholder not yet checked by Chiara. Display it as-is (no special logic).
### sfide.csv — categories
`sfida;icona;accento;sfondo;timer;carattere;dimensione;colore_testo;allineamento`
(sfondo → assets/sfondi/; timer → seconds or blank; allineamento → sinistra|centro|destra)
Tile order in the grid = row order in the file.
### livelli.csv — levels
`livello;nome_de;colore;ordine`
### testi_ui.csv — interface text
`chiave;de;it`

## 7. Validation (protects a non-programmer)
On load, check: every card's sfida exists; every level in `livelli` exists; opzioni has exactly 3
values when set; referenced files (sfondo, icona, media, immagine, fonts) load; every UI key has de+it.
Show a small dismissible banner listing problems by file + row ("carte.csv riga 14: livello
'Facil' non esiste"). Skip bad rows; never crash.

## 8. File structure
```
index.html  style.css  app.js  vendor/papaparse.min.js
data/  (the 4 CSVs)
assets/sfondi/  assets/icone/  assets/carte/  assets/media/  assets/fonts/
docs/skizze-app.pdf
```

## 9. Hosting
GitHub Pages from `main` (root). Generate a QR code to the Pages URL → `docs/qr.png`.
Nice-to-have after everything works: installable PWA for offline play at the table.
