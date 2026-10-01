# Card Review Report

**Reviewer:** Native Italian Teacher (Jules / Gemini 2.5 Pro)
**Dataset:** `data/carte.csv` (590 cards reviewed)
**Target Audience:** German-speaking learners of Italian

---

## Problematic Cards Table

| CSV Row | Card | Problem | Suggested Correction | Confidence |
| :---: | :--- | :--- | :--- | :---: |
| 115 | `la camicia` | Distractor option 2 (`le camice`) is a homograph of the valid plural for `il camice` (lab coat/smock). While incorrect for `la camicia`, using a real Italian plural noun as a distractor can confuse B1 learners. | Replace `le camice` with an unambiguous spelling distractor like `le camiciee` or `le camici`. | low |
| 119 | `la ciliegia` | Distractor option 2 (`le ciliegi`) mixes feminine article `le` with masculine plural noun `ciliegi` (cherry trees). Note also that `le ciliege` (without `i`) is accepted as a valid variant in modern Italian dictionaries (e.g., Treccani, DOP), so distractor choices must avoid orthographic ambiguity. | Ensure distractors are clearly ungrammatical or morphological errors, e.g., `le cilieggie` or `i ciliegia`. | medium |
| 168 | `il capostazione` | Option 1 is `i capistazione`. Option 2 (`i capostazioni`) and Option 3 (`i capistazioni`) both involve pluralizing `stazione`. In modern spoken Italian, `i capostazione` is also heard, making the distinction subtle for learners. Option 3 (`i capistazioni`) pluralizes both nouns. | Use clearer wrong forms for distractors, e.g., `i capostazione` (invariable) or `i capostazio`. | high |
| 368 | `Maria è un amica di mia madre.` | Option 3 (`un'amico`) introduces an apostrophe on a masculine noun `amico`, creating a double error (wrong gender + incorrect apostrophe on masculine `un`). | Replace Option 3 with `una amico` or `un amica` to isolate the orthographic issue cleanly. | low |
| 450 | `Lettera: Q` | The difficulty level is listed as `Medio\|Difficile` rather than a single level value (`Medio` or `Difficile`). Multi-level pipe-separated strings in the level column can break strict single-level filtering in UI code. | Set level consistently to `Medio`. | medium |
| 476 | `Oh che orrore, ho visto un ramarro verde...` | The difficulty level is listed as `Facile\|Medio` instead of a single level value (`Facile` or `Medio`). | Standardize level column to a single value, e.g. `Medio`. | medium |
| 477 | `Se oggi seren non è, doman seren sarà...` | The difficulty level is listed as `Facile\|Medio` instead of a single level value. | Standardize level column to `Medio`. | medium |
| 479 | `Stanno stretti sotto i letti sette spettri...` | The difficulty level is listed as `Facile\|Medio\|Difficile` instead of a single level value. | Standardize level column to `Medio`. | medium |
| 505 | `Quali sono i colori della bandiera italiana?` | Option 1 (`Verde, bianco e rosso`) contains commas inside the option string. While the primary option delimiter is `\|`, nested commas can break basic CSV option-splitting logic in simple frontend parsers if split on `,`. | Keep text as is, but ensure parser splits strictly on `\|`. | low |

---

## Summary

- **Total Cards Checked:** 590

### Problems per Category

| Category (Sfida) | Cards Checked | Problems Found |
| :--- | :---: | :---: |
| `PARLA DI TE` | 76 | 0 |
| `CREA IL PLURALE` | 91 | 3 |
| `CONIUGA IL VERBO` | 114 | 0 |
| `INDOVINA IL MODO DI DIRE` | 78 | 0 |
| `TROVA L'ERRORE` | 76 | 1 |
| `COSE-NOMI-CITTÀ` | 26 | 1 |
| `LEGGI LO SCIOGLILINGUA` | 41 | 3 |
| `QUIZ DI CULTURA GENERALE` | 88 | 1 |
| **Total** | **590** | **9** |

---

## Detailed Evaluation Criteria Verified

1. **Italian Naturalness & Correctness:**
   - Evaluated `testo`, `opzioni`, and `risposta` across all 590 cards.
   - Verified proper orthography, accents (e.g., `è` vs `e`), apostrophes, and standard Italian grammar.

2. **Option Structure & Correctness:**
   - Option 1 is unambiguously the correct answer for all multiple-choice cards.
   - Options 2 and 3 are clearly incorrect distractors and do not contain accepted regional forms or valid alternative spellings (with notes on homographs in plural cards #115 and #119).

3. **Difficulty Levels for German-Speaking Learners:**
   - Evaluated CEFR alignment for German-speaking learners:
     - **Facile (A1/A2):** Basic vocabulary, present tense, simple plurals, elementary culture.
     - **Medio (B1/B2):** Past tenses, irregular plurals, German-Italian false friends (*mensa*, *appuntamento*, *pensione*, *cartella*, *azienda*, *borsa di studio*), intermediate idioms/culture.
     - **Difficile (C1/C2):** Subjunctives, conditionals, hypotheticals, passive voice, double pronouns, historical/cultural depth.
   - Flagged multi-level strings in `COSE-NOMI-CITTÀ` (#450) and `LEGGI LO SCIOGLILINGUA` (#476, #477, #479) for standardized filtering.

4. **Fact & Idiom Accuracy:**
   - All historical dates, geography, literature, art, and music facts in `QUIZ DI CULTURA GENERALE` were verified as true.
   - All idiom definitions and example usages in `INDOVINA IL MODO DI DIRE` were verified as accurate.

5. **Trova l'Errore Validation:**
   - Every `TROVA L'ERRORE` card contains exactly one realistic error typical for Italian learners / German speakers.
   - Option 1 correctly rectifies the error.
   - Explanations in `risposta` correctly state the underlying grammatical rule.
