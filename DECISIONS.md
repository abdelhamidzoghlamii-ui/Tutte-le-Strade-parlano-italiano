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
