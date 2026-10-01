# DECISIONS

Append-only. Never edit old entries.

## 2026-09-30 — Plan approval (Abdel)
1. Git: work only on the session branch; at the end of each slice open/update a PR to `main`,
   Abdel merges on GitHub. No tags. (Overrides CLAUDE.md "branch per slice / --no-ff / tag".)
2. Missing UI keys (timer, exit confirmation, validation messages, …) are added to testi_ui.csv.
3. DE/IT toggle per the brief; labels are never shown in both languages at once.
4. Grid bottom: two buttons, [esci] and [impostazioni].
5. Card screen: [chiudi] + [altra_carta] only; no [esci].
6. Fonts: `carattere` → `assets/fonts/<carattere>.woff2`, loaded with the FontFace API. A new font
   needs only a correctly named file. Missing file → banner warning + fallback font.
   Patrick Hand + Caveat come from npm @fontsource (OFL).
7. `accento` colors the tile's icon circle and the card's accent.
8. `dimensione` = max font size in px; long prompts shrink to fit.
9. Tricolore stripe = dashes (green / white / red), as in the sketch.
10. Card back with `sfondo` set = same template as the front.
11. With `immagine` set, [aiuto] and [soluzione] overlay the image.
12. No-repeat pool per category + level; resets when exhausted and on [nuova_partita].
13. Active player changes manually only (popup); the board handles turns.
14. [impostazioni] → screen 2 with previous answers pre-filled.
15. Hilfe: one tap locks the choices and highlights the correct one. Hidden on the card back.
16. Timer starts on tap.
17. DE/IT: small corner switch on every screen.
18. Pages URL: https://abdelhamidzoghlamii-ui.github.io/Tutte-le-Strade-parlano-italiano/
    (Abdel enables Pages on `main` at slice 9).

## 2026-09-30 — Slice 1 implementation choices (lead)
- CDNs (jsdelivr, cdnjs, unpkg) are blocked from the build environment → vendor files come from
  the npm registry (`npm pack`).
- CSV files that are not valid UTF-8 are decoded as Windows-1252 and flagged in the banner
  (Excel "CSV" instead of "CSV UTF-8").
- Row numbers in the banner = Excel row numbers (header = row 1); empty rows are skipped without
  shifting the numbering.
- Validation messages are templates in testi_ui.csv (`err_*` keys), shown in the current language.
- Bad data policy: unknown sfida / no valid level / no text and no image → row skipped; unknown
  single level → that level dropped; opzioni ≠ 3 → card kept without Aiuto; missing asset file →
  warning only.

## 2026-09-30 — Slices 2+3 (Abdel / lead)
- Budget rule (Abdel): builder applies all review fixes and writes/runs the Playwright tests from the lead's test list; lead reviews diffs, test reports and ≤2 screenshots.
- Slices 2 and 3 done together as one slice/PR.
- Blank player names stay blank in state; the default "Giocatore n"/"Spieler n" is derived at display time so it follows the language.
- Duplicate chiave in testi_ui.csv → warning, first occurrence wins.
- No back buttons in the setup flow (not in brief/sketch); [impostazioni] is the way back.

## 2026-09-30 — Slices 4+5 (lead)
- Top field is not clickable on the card screen (change player from the grid).
- Pool refill avoids an immediate repeat of the last card.
- CARD_FEATURES registry = the hook for per-category features (timer, media).
- Grow-from-tile animation deferred to slice 8; Hilfe and flip actions in slice 6.
- [esci] returns to the start screen; setup is kept until [nuova_partita].

## 2026-09-30 — Slices 6+7 (lead)
- Front tap does not flip (only [soluzione] or a horizontal swipe); a tap on the back flips back.
- Immagine variant back = category sfondo if any, else cream card with CSS header.
- Hilfe state survives flipping; resets on a new card.
- Timer lives outside the flipping card so it stays visible on the back; counts from timestamps.
- Feature registry contract: applies/render(ctx)/cleanup; cleanups run on every card change or exit.
- Timer on language switch: state is kept (timestamp based, stored per card); the card re-renders and the timer continues.
- Deferred (lead review): media image on an `immagine`-variant card may overlap the card image
  (unlikely combination); vertical fit at 320x640 with the timer slot and real-touch swipe are
  checked in slice 8.

## 2026-10-01 — Placeholder templates + slice 8 (lead)
- Canva reference download blocked by the build proxy (403); Abdel pushes docs/riferimenti/ from his laptop.
- Placeholder templates generated (750×1050, 5:7), named by category slug (lowercase, accents stripped,
  non-alphanumerics -> '-'); replace by uploading a PNG with the same name. sfide.csv `sfondo` filled.
- Taken from docs/riferimenti: tricolore frame (green left, red right, diagonal green/white/red stripes
  top and bottom), off-white #f8f8f1 face, centred bold uppercase title, category icon bottom-right, hand-written
  prompt in the middle, palette green #0a9246 / red #ce2b37. The CSS-header variant uses the same frame
  (stripe element stays in the DOM, hidden by CSS) with the icon circle bottom-centre so it never collides with
  Hilfe options or the buttons.
- sfondo-variant text area is set by CSS variables in the CARD STYLE block (--tpl-top 0.20, --tpl-bottom 0.13,
  fractions of card height); they must match the templates.
- Grow-from-tile via FLIP on the .card-wrap wrapper (not .card-flip), 350 ms, WAAPI; none under
  prefers-reduced-motion. [chiudi]: no card animation, the grid fades in (0.25 s).
- Item 6: a card with `immagine` set skips its `media` entirely (simplest, console-free); revisit if that
  combination is ever used.
- Small screens (max-height 740px): compact tiles (icon left of the name), smaller reserved space around the card.

## 2026-10-01 — Slice 9 (Abdel / lead)
- Standard card = the reference layout from docs/riferimenti (tricolore frame, centred title top, icon bottom-right); BUILD_BRIEF §3.5/§4 updated, approved by Abdel. Templates and CSS fallback share it.
- Template rule for Chiara: exactly 750×1050 px, top ~20% and bottom ~13% free of text (README).
- QR (docs/qr.png) generated with the npm `qrcode` package in the scratchpad (not in the repo) and decoded to verify it equals the Pages URL.
- The live Pages URL could not be checked from the build environment (github.io blocked); Abdel verifies on a phone (README release checklist).
- PWA skipped for now. `.nojekyll` added.

## 2026-10-01 — QA review + Phase 2A/2B (Abdel / lead)
- Review findings 1–26 approved for fixing; work in 5 batches on the session branch, one PR.
- D1: `icona_dimensione` = px on the 750×1050 Canva template, scaled to the card on screen.
- D2: on template (sfondo) cards the app draws the category icon only when `icona_posizione` is set
  (blank = the template brings its own icon).
- D3: default text area = 20% top / 22% bottom of the card height (both variants); README updated.
- D4: no history entries — Back keeps its normal browser behaviour. `overscroll-behavior-y: none`
  stops accidental pull-to-refresh; recovery after leaving/reloading is the saved game (2B).
- D5: Playwright test suite committed in `tests/` (dev only, `node tests/run.mjs`; not used by the site).
- Item 27 (out of scope, content decision for Chiara): the board legend does not match sfide.csv —
  the board has "indovina il rebus", "ordina da bere e/o da mangiare", "nomi, cose, città"; the app has
  QUIZ DI CULTURA GENERALE (not on the board). Board icons could be exported as PNG into assets/icone/.
- Batch 1 (lead): the language switch is a header row in flow; the card screen is locked to the viewport
  and the card is sized by a size container (cqw/cqh), replacing the fixed `--card-reserved` heights.
  Button green behind white text = #007a3a (4.5:1); #009246 stays for the tricolore.
- Batch 2 (lead): one card geometry for template and CSS cards (unit = 1 px of the 750×1050 template); the fit
  scales prompt + Hilfe options together, never splits words above 14px, scrolls (with a cue) instead of clipping.
  [aiuto] left / [soluzione] right as in the sketch; on cards < 430px tall the pills move to the free side of the icon.
  Placeholder templates: baked icon moved down 20 px (78–87% of the height). Images are preloaded; audio is not.
- Batch 3 (lead): only key columns are required (a missing optional column = one warning). Banner = collapsible,
  collapsed on game screens, max 10 lines per file. Typos get a "forse '…'?" hint. Hilfe options use aria-disabled
  after a pick (focus stays).
- Batch 4 (lead): preview = index.html?anteprima (same renderer, fixed card height 360/480/600). Extra banner warning
  when the app-drawn icon reaches into the text area. Banner is in flow, not sticky.
- Batch 5 (lead): saved game = localStorage `tlspi-partita`, cards stored by content (sfida+testo+immagine), refreshed
  on every save (24 h counts from the last action). The resume dialog cannot be dismissed with Escape/backdrop.
- Known limit: headless Chromium has no Italian hyphenation, so on the 320px compact grid a long tile word may break
  without a hyphen; phones with hyphenation dictionaries (iOS, Android Chrome) hyphenate.

## 2026-10-01 — Card decks (Abdel / lead)
- data/carte.csv replaced by 590 drafted cards (8 decks, ≥ 20 per category × level). Every risposta starts with
  [DA CONFERMARE] for Chiara's check. Drafted by builder agents, every card reviewed by the lead; rejected/changed
  cards are listed in the PR.
- COSE-NOMI-CITTÀ: one card per letter, valid for several levels (letters are level-neutral): 19 letters + H at
  Facile (H is easy for German speakers), + Q at Medio, + J K W X Y at Difficile.
- LEGGI LO SCIOGLILINGUA: only traditional texts found in several Italian collections (web search); 41 texts, short
  ones at Facile, long ones at Difficile, some shared by two or three levels to reach 20 per level.
- Tests no longer depend on the content of data/carte.csv: the old sample cards are frozen in tests/fixtures/sample.
