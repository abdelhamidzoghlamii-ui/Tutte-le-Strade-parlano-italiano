# CLAUDE.md — how this repo is built

Runs in **Claude Code on the web** (cloud), connected to this GitHub repo. Product spec:
BUILD_BRIEF.md. UX sketch: docs/skizze-app.pdf. Read all three before acting.

## Roles
- **Main session = Opus 5.5, medium effort — planner/reviewer (LEAD).** Plans, splits work into
  slices, writes precise task specs, reviews diffs, tests in the browser, commits. Writes as little
  code itself as possible.
- **`builder` subagent = Sonnet 5.5 — coder** (.claude/agents/builder.md). Does the implementation
  per Opus's specs.
- **Abdel** — approves plans, relays between this session and the strategy chat (claude.ai).
- Chiara (non-programmer) maintains content only via the CSV files — every design choice must
  keep that easy.

## Budget (~$100 credits — the point of this setup)
- Delegate code writing to `builder`. Opus reviews diffs, not whole files.
- Reference BUILD_BRIEF.md by section instead of restating it.
- Terse messages. No long summaries. Abdel strongly prefers terse.
- Report approximate usage at the end of every slice.

## Step 0 — verify delegation works
Invoke `builder` on a trivial task (e.g. create `vendor/` and download PapaParse min.js from a CDN
you are allowed to reach). Confirm it ran on Sonnet and produced the file. Report VERIFIED / FAILED.
If FAILED, stop and tell Abdel — don't silently do everything on Opus.

## Loop per slice
plan → Abdel approves → `builder` implements → Opus reviews against the brief + acceptance checks
→ fix → commit → push.
- Plans are presented before any code is written.
- If `builder` fails the same task twice, Opus writes that piece itself (replace the mechanism,
  don't keep patching).
- Triage review findings: **fix-now** (silent failures), **measure-first** (unverified), **defer**
  (log in DECISIONS.md, move on).
- Work on a branch per slice; merge to `main` with `--no-ff`; tag at slice boundaries.
- Always flag **inferred vs verified** (e.g. "verified in browser" vs "should work").

## Slice order (suggested)
1. Scaffold + PapaParse + CSV loader (`;` auto-detect, BOM) + validation banner.
2. i18n from testi_ui.csv + DE/IT toggle.
3. Setup flow (screens 1–3B2, sketch pp. 1–2).
4. Category grid + top field (group level / player selector popup).
5. Card: draw logic, front render (template vs CSS header, per-category style), no-repeat.
6. Flip + swipe + solution; Hilfe multiple choice.
7. Timer + media features.
8. Canva-matching card CSS polish, grow/flip animations, mobile check.
9. GitHub Pages + QR. (Then optional PWA.)

## Acceptance checks on every review
No build step · CSVs `;` and `,` both parse · accents/umlauts render · nothing hardcoded that
belongs in a CSV · bad rows reported, never crash · works on a phone-width viewport.

## Docs
- DECISIONS.md is append-only (create on first decision). Never edit old entries.
- Changes to BUILD_BRIEF.md / CLAUDE.md / README.md only after Abdel approves them.

## Plugins
None. No-build static site; plugins only add context cost.
