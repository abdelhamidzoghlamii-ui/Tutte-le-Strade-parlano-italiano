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
3. Aspetta circa un minuto e ricarica il gioco.

## Se qualcosa non va
All'avvio il gioco mostra un avviso se trova un errore (es. un livello scritto male), con il nome
del file e il numero della riga. Correggi e ricarica il file.

---

# PART 2 — Technical (Abdel)

- Built with Claude Code on the web; workflow in `CLAUDE.md`, spec in `BUILD_BRIEF.md`, UX sketch in
  `docs/skizze-app.pdf`.
- Run locally: `python -m http.server` in the repo root → http://localhost:8000
- Hosting: GitHub Pages from `main` (root). Settings → Pages → Deploy from a branch → `main` / root.
- QR code to the Pages URL: `docs/qr.png`.
