# Desktop in a Desktop

Un'estensione per browser Chromium (Chrome, Brave, Edge…) che sostituisce la pagina «Nuova scheda» con una scrivania libera: più **spazi** (come schede), una **barra di cassetti** in alto con i tool, e widget che trascini dove vuoi. Posizione e contenuto si salvano da soli.

Tutto resta **sul tuo computer**: nessun account, nessun cloud, nessuna rete, nessuna statistica.

## Cosa c'è dentro

49 widget, in sei categorie:

- **Appunti** – post-it (con disegno), taccuino (markdown), da fare, lavagna, obiettivo del giorno, diario, schede di ripasso, bacheca
- **Tempo** – orologio, timer, Pomodoro, cronometro, calendario, fusi orari, conto alla rovescia, promemoria con notifica, intervalli, agenda
- **Numeri** – calcolatrice, convertitore, contatore, spese, salvadanaio, dividi il conto, progresso, acqua
- **Benessere** – abitudini, respiro, pausa occhi, umore, gratitudine, sonno, serie di giorni, pianta
- **Link e immagini** – link rapidi, ricerca, immagine, tavolozza, etichetta, cornice
- **Svago** – dadi, bolle, suoni, 2048, memory, tris, ruota della fortuna, pioggia, caminetto

Altro: lancio dei widget con inerzia e rimbalzi, leggera rotazione casuale (disattivabile), cassetti per categoria (opzionali), barra di ricerca fissa al centro, sei temi di colore, sincronizzazione tra schede aperte.

## Privacy e permessi

L'estensione chiede solo: `storage` (salvare i dati), `alarms` e `notifications` (timer e promemoria a scheda chiusa), `search` (la barra di ricerca usa il motore predefinito del browser). Non legge né modifica nessun sito. I dati stanno in IndexedDB, nel profilo del browser.

> I dati non vengono sincronizzati fra computer e **non c'è ancora export/import**: disinstallando l'estensione o cancellando i dati del browser si perdono.

## Installare (da sorgente)

Serve Node.js 20+.

```sh
npm install
npm run build        # crea .output/chrome-mv3
```

Poi in `chrome://extensions` (o `brave://extensions`): attiva «Modalità sviluppatore» → «Carica estensione non pacchettizzata» → scegli `.output/chrome-mv3`.

Per sviluppare con ricarica automatica: `npm run dev`. Per ottenere uno zip da distribuire: `npm run zip`.

## Test

```sh
npm run compile      # controllo dei tipi
npm test             # test unitari (Vitest)
npm run test:e2e     # test nel browser (Playwright)
```

I test e2e caricano la versione compilata in un browser Chromium reale. Il browser è cercato tra quelli installati (vedi `playwright.config.ts`); per sceglierne uno, imposta `E2E_BROWSER=/percorso/del/browser`.

## Struttura

- `entrypoints/` – pagina della nuova scheda e service worker (notifiche)
- `src/core/` – modello dati, salvataggio, sincronizzazione tra schede, fisica, temi
- `src/components/` – tela, cassetti, schede, impostazioni
- `src/widgets/` – un file per widget (si registra con `registerWidget`) più la logica pura con i suoi test
- `e2e/` – test nel browser

Aggiungere un widget: crea `src/widgets/nome.tsx`, chiama `registerWidget({...})` e importalo in `src/widgets/index.ts`.

## Licenza

MIT – vedi [LICENSE](LICENSE).
