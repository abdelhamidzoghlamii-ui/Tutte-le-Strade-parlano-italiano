# Tutte le strade... parlano italiano! — app di accompagnamento

App web per il gioco da tavolo per imparare l'italiano. Si scansiona il QR, si scelgono i giocatori
e il livello, si tocca una categoria, si legge la carta e poi si gira la carta per vedere la soluzione.

---

# PARTE 1 — Per Chiara: gestire le carte (senza programmare)

Modifichi solo i file nella cartella `data/` (aprili con Excel) e, a volte, metti un'immagine in una
cartella dentro `assets/`.

**Regole d'oro**
- In Excel salva sempre con **File → Salva con nome → CSV UTF-8**. Il "CSV" normale rovina gli
  accenti (à è) e le dieresi (ä).
- Quando una cella ha **più valori**, separali con la barra verticale **|** (es. `Facile|Medio`).
- I nomi devono essere scritti **esattamente** uguali in tutti i file (maiuscole e accenti compresi).

## Le carte  →  `data/carte.csv`
Ogni riga è una carta. Colonne:
- **sfida** — la categoria. Uguale a una riga di `sfide.csv`.
- **livelli** — per quali livelli va bene la carta. Uno o più: `Facile`, `Medio`, `Difficile`
  (es. `Facile|Medio`).
- **testo** — la domanda scritta sulla carta. Qui scrivi la carta.
- **opzioni** — le 3 risposte che appaiono con il pulsante "Aiuto". **La prima è quella giusta**
  (l'app le mescola). Es. `le amiche francesi|le amici francesi|le amiche francese`.
  Lascia vuoto se la carta non ha aiuto.
- **media** — facoltativo: un'immagine o un audio (es. per il quiz di cultura). Metti il file in
  `assets/media/` e scrivi qui il nome del file.
- **immagine** — di solito VUOTO. Solo se hai disegnato la carta intera in Canva (vedi sotto).
- **risposta** — la soluzione sul retro della carta. Vuoto = la carta non si gira (es. "Parla di te").

`[DA CONFERMARE]` = soluzione scritta come bozza, ancora da controllare. Quando l'hai verificata,
cancella semplicemente quella scritta.

Aggiungere una carta = aggiungere una riga. Correggerla = modificare la riga.

## Le categorie  →  `data/sfide.csv`
Ogni riga è una categoria (una casella nel menu del gioco, nello stesso ordine del file).
1. In Canva crea **un solo modello** di carta per la categoria. Scaricalo come **PNG** e mettilo in
   `assets/sfondi/`. Tutte le carte della categoria useranno questo modello.
   I file che trovi ora in `assets/sfondi/` sono **modelli provvisori** (con la scritta
   PLACEHOLDER). Per sostituirne uno: esporta da Canva il tuo PNG in verticale 5:7 (per esempio
   750×1050 px), con l'intestazione in alto e il centro vuoto (lì l'app scrive il testo), e caricalo
   in `assets/sfondi/` con **esattamente lo stesso nome** del file provvisorio. Non devi cambiare
   nient'altro.
   **Misure:** stessa dimensione dei modelli provvisori, in verticale, **esattamente 750 × 1050 px**.
   Lascia **libero** circa il 20% in alto (i primi ~210 px) e circa il 22% in basso (gli ultimi
   ~231 px): l'app scrive il testo della carta nel mezzo e mette i pulsanti in basso. L'icona della
   categoria va in basso a destra, dentro quella fascia (circa tra 820 e 915 px dall'alto).
   Se il tuo modello ha altre misure, i due margini si possono cambiare **per categoria** (vedi
   «Regolare la carta di una categoria» qui sotto).
2. Colonne:
   - **sfida** — nome della categoria. **icona** — una emoji, oppure il nome di un'immagine messa
     in `assets/icone/`. **accento** — un colore (es. `#009246`).
   - **sfondo** — il nome del modello PNG. Se vuoto, l'app usa una carta semplice con le strisce
     tricolori.
   - **timer** — secondi del timer (es. `60`), oppure vuoto se la categoria non ha timer.
   - **carattere / dimensione / colore_testo / allineamento** — lo stile della scrittura di questa
     categoria: nome del font, grandezza, colore, `sinistra` / `centro` / `destra`.
   - Il nome in **carattere** deve corrispondere a un file in `assets/fonts/` chiamato esattamente
     `<carattere>.woff2` (es. `Patrick Hand.woff2`). Per aggiungere un font metti lì il file
     `.woff2` con il nome giusto. Se manca, l'app mostra un avviso e usa un carattere standard.

### Regolare la carta di una categoria
Quattro colonne facoltative di `sfide.csv`. Se sono vuote vale lo standard.
- **icona_posizione** — dove l'app disegna l'icona: `alto-sinistra`, `alto-centro`, `alto-destra`,
  `basso-sinistra`, `basso-centro`, `basso-destra` (es. `basso-sinistra`; vanno bene anche maiuscole o
  uno spazio al posto del trattino). Standard: in basso a destra.
- **icona_dimensione** — grandezza dell'icona, da 20 a 400 (es. `120`). Standard: 100.
- **testo_margine_alto** — spazio libero in alto prima del testo, da 0 a 45 (es. `25`). Standard: 20.
- **testo_margine_basso** — spazio libero in basso dopo il testo, da 0 a 45 (es. `30`). Standard: 22.
  Alto + basso insieme al massimo 80.

Le unità: **icona_dimensione** è in pixel del modello 750×1050, quindi `100` = 100 px sul modello di
Canva. I **margini** sono in % dell'altezza della carta. Per i numeri vanno bene `20`, `20%` e `20,5`
(anche `100px`). Un valore non valido dà un avviso e il gioco usa lo standard.

Se ingrandisci l'icona o la metti in alto, aumenta il margine corrispondente: l'avviso in alto ti segnala il problema, e lo controlli nell'anteprima con «Mostra area testo e icona».

**Carte con un modello (colonna sfondo):** l'app disegna l'icona **solo se `icona_posizione` è
compilata**. Se l'icona è già nel modello di Canva, lascia la cella **vuota**, altrimenti compare due volte.
Le carte semplici (senza sfondo) hanno sempre l'icona.

**Anteprima.** Per vedere tutte le categorie insieme apri il gioco aggiungendo `?anteprima` all'indirizzo:
https://abdelhamidzoghlamii-ui.github.io/Tutte-le-Strade-parlano-italiano/?anteprima
Per ogni categoria vedi una carta (quella con il testo più lungo, il caso peggiore) e sotto i valori delle
quattro colonne. I pulsanti in alto:
- **piccola / media / grande** — la grandezza delle carte;
- **Mostra l'aiuto** — apre le 3 opzioni sulle carte che le hanno;
- **Mostra il retro** — mostra il retro invece del fronte;
- **Mostra area testo e icona** — tratteggio rosso = area dove va il testo, puntini blu = dove va
  l'icona: serve per allineare il modello di Canva.
Il link «Torna al gioco» riporta al gioco. L'anteprima non cambia nulla nei file.

## I livelli  →  `data/livelli.csv`
- **livello** — nome italiano (quello usato in `carte.csv`). **nome_de** — nome tedesco.
- **colore** — colore del pulsante. **ordine** — 1 = più facile.
Se rinomini un livello, rinominalo anche in `carte.csv`.

## I testi dei pulsanti  →  `data/testi_ui.csv`
Ogni riga è un testo dell'app in tedesco (**de**) e italiano (**it**). Puoi cambiare le parole;
non cambiare la colonna **chiave**.

## Facoltativo: una carta disegnata interamente in Canva
Esporta la carta come PNG, mettila in `assets/carte/` e scrivi il nome del file nella colonna
**immagine**. L'app mostrerà la tua immagine invece del testo.

## Come pubblicare le modifiche
1. Salva il file (CSV UTF-8) o esporta il PNG.
2. Su **github.com** apri il progetto → entra nella cartella giusta → **Add file → Upload files**
   (trascina il file; se ha lo stesso nome lo sostituisce) → **Commit changes**.
3. Aspetta 1–2 minuti e ricarica il gioco. Un'immagine sostituita con lo stesso nome può comparire solo dopo circa 10 minuti (memoria del browser).

## Se qualcosa non va
All'avvio il gioco mostra un avviso se trova un errore (es. un livello scritto male), con il nome
del file e il numero della riga. Correggi e ricarica il file.
- Se un nome è scritto quasi giusto (maiuscole, accenti, uno spazio o una lettera di troppo), l'avviso
  propone quello giusto: "(forse 'Facile'?)".
- Un colore scritto male (es. `rosso` invece di `#CE2B37`) dà un avviso e il gioco usa il colore standard.
- Se manca una **colonna facoltativa** (per esempio `risposta` o `media` in `carte.csv`) c'è solo un
  avviso e il gioco la considera vuota. Le colonne indispensabili sono: `sfida`, `livelli`, `testo`
  (carte), `sfida` (sfide), `livello` (livelli), `chiave`, `de`, `it` (testi).
- Se un file è vuoto (solo la riga delle intestazioni) l'avviso è uno solo e il gioco mostra il messaggio
  al posto dei pulsanti.
- L'avviso in alto si apre e si chiude toccando il titolo; sulle schermate di gioco è chiuso, per non
  rimpicciolire la carta.

---

# PART 2 — Technical (Abdel)

- Built with Claude Code on the web; workflow in `CLAUDE.md`, spec in `BUILD_BRIEF.md`, UX sketch in
  `docs/skizze-app.pdf`.
- Run locally: `python -m http.server` in the repo root → http://localhost:8000
- Tests: `node tests/run.mjs [filter] [--shots]` (needs Playwright + Chromium; dev only, not used by the site).
  Screenshots with `--shots` go to `tests/out/shots/` (git-ignored).
- Hosting: GitHub Pages from `main` (root). Settings → Pages → Deploy from a branch → `main` / root.
- Live URL: https://abdelhamidzoghlamii-ui.github.io/Tutte-le-Strade-parlano-italiano/
- QR code to the Pages URL: `docs/qr.png` (regenerate if the URL changes). `.nojekyll` at the root makes Pages serve files as-is.

## Release checklist (on a real phone, after each release)
- Open the live URL by scanning `docs/qr.png`. (Add-to-home-screen is not required.)
- Both setup paths work: same level for all, and per-player levels.
- Horizontal swipe flips the card, and swiping again flips it back.
- Timer (COSE-NOMI-CITTÀ): start, pause, resume, time's up. Vibration on Android only; iPhone does not vibrate.
- Audio plays on a media card (QUIZ DI CULTURA).
- DE/IT switch still holds after reloading the page.
