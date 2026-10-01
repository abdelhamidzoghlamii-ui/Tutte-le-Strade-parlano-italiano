# Code Review Report (Jules-CLAUDE)

## Summary
- **Blocker / Major**: 0
- **Minor**: 3
- **Polish**: 1

I tested the application across multiple screen sizes (320x568, 375x667, 390x844, 412x915, desktop) and ran it using Playwright scripts representing a hostile QA session (rapid tapping, resizing, navigating backwards via reloading). The application relies robustly on modern browser APIs and behaves extremely predictably given its static site nature. The local test runner using Playwright (`node tests/run.mjs --shots`) passes gracefully. There were no critical functional bugs identified during stress-testing.

## Findings

### General Code & Content Findings

| ID | Severity | Problem / Steps to Reproduce | Evidence | Proposed Fix |
|---|---|---|---|---|
| **J-CLAUDE-001** | Minor | In `data/carte.csv`, row 5, the sentence "Mio cugino Giovanni vive in Roma" incorrectly implies "in Roma" instead of "a Roma" is an accepted structure unless you mean the answer. The correct answer in `risposta` and option is currently listed but the phrasing in the answer "vive A Roma" is right. But the option text has "vive a Roma". | `data/carte.csv` Row 5 | Change the `testo` and ensure `risposta` correctly lists "vive a Roma". The options are correct. |
| **J-CLAUDE-002** | Minor | In `data/carte.csv`, row 9, "andare (noi, passato prossimo)". The correct first option is "siamo andati". The `risposta` mentions "siamo andati/e". | `data/carte.csv` Row 9 | The options list "siamo andati" but not "siamo andate". It would be more accurate if the options match the gender-inclusive `risposta` or strictly stick to "siamo andati". |
| **J-CLAUDE-003** | Polish | `[DA CONFERMARE]` is prepended to `risposta` strings in `data/carte.csv`. | `data/carte.csv` | Remove the `[DA CONFERMARE]` prefix from all cards. |
| **J-CLAUDE-004** | Minor | `app.js` line 1290 uses `setInterval(tick, 250)` for the timer tick. While functional for seconds, it could lead to minor drift visually. | `app.js` | Given that it calculates using `Date.now()`, the functional time is correct. This is just a minor note that `requestAnimationFrame` provides smoother rendering, but what is there works adequately. |

### Card Review Table

| Row | Card (Testo) | Problem | Suggested Correction |
|---|---|---|---|
| 2 | l'amica francese | `[DA CONFERMARE]` prefix | Remove `[DA CONFERMARE]` |
| 3 | il libro | `[DA CONFERMARE]` prefix | Remove `[DA CONFERMARE]` |
| 4 | in bocca al lupo! | `[DA CONFERMARE]` prefix | Remove `[DA CONFERMARE]` |
| 5 | Mio cugino Giovanni vive in Roma | `[DA CONFERMARE]` prefix | Remove `[DA CONFERMARE]` |
| 6 | la problema è che non ho mai tempo per studiare | `[DA CONFERMARE]` prefix | Remove `[DA CONFERMARE]` |
| 7 | essere (io, presente) | `[DA CONFERMARE]` prefix | Remove `[DA CONFERMARE]` |
| 8 | andare (noi, passato prossimo) | `[DA CONFERMARE]` prefix, Missing feminine plural option | Remove `[DA CONFERMARE]`. Add "siamo andati/e" to options to match answer. |
| 12 | Qual è la capitale d'Italia? | `[DA CONFERMARE]` prefix | Remove `[DA CONFERMARE]` |

*(Other rows in `data/carte.csv` had empty `risposta` fields or no issues detected).*

## Testing Details
- Ran Playwright UI scripts to simulate rapid user actions through both flow paths (Group and Player).
- Reloaded the page mid-card; the state (`localStorage`) persisted correctly.
- Switched language mid-card; translation toggled successfully.
- Triggered corrupted/broken CSV variants; application properly fell back on rendering warnings without crashing, handling missing columns effectively.
- Viewport tests captured screenshots located in `reviews/shots-claude/`.

**What I could not test:**
- Real physical device vibration triggers (the Web API `navigator.vibrate` is called but can only be verified accurately on mobile hardware).
- Sound output since Playwright headless doesn't provide audio hardware.
- Real touch-based swipe motions (used simulated clicks and coordinate swipes).