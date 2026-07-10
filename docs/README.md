# Documentazione Assetta
Questa cartella spiega come è fatto il progetto, per chi lo deve mantenere ma non conosce bene React, TSX o TypeScript.

Ordine di lettura consigliato:

1. **[GUIDA-REACT-TS.md](./GUIDA-REACT-TS.md)** — i concetti minimi di React/TSX/TypeScript usati in questo progetto, spiegati con esempi presi dal codice reale. Parti da qui se i termini "componente", "hook", "props", "state" non ti sono familiari.
2. **[ARCHITETTURA.md](./ARCHITETTURA.md)** — come si muovono i dati nell'app: da Google Sheet, a localStorage, alla schermata. È il documento più importante per capire *dove* mettere le mani quando qualcosa non torna nei numeri.
3. **[STRUTTURA-PROGETTO.md](./STRUTTURA-PROGETTO.md)** — mappa cartella per cartella, file per file: cosa fa ciascun file e quando ti serve aprirlo.

## Cos'è Assetta in due righe

Una dashboard di finanza personale, per un solo utente, tutta in italiano. Non ha un server/database proprio: legge e scrive tutti i dati in un **Google Sheet** che appartiene all'utente. React si occupa solo di mostrare quei dati e di permettere di modificarli comodamente.

## Comandi utili

```bash
npm run dev      # avvia l'app in locale (http://localhost:3000)
npm run build    # crea la build di produzione (usata da Vercel per pubblicare l'app)
npm run lint     # controlla che il codice TypeScript sia corretto (non ci sono test automatici)
```

Non esiste una suite di test: l'unico controllo automatico è `npm run lint` (in realtà è un controllo dei tipi TypeScript, `tsc --noEmit`). Dopo ogni modifica va lanciato quello, e poi va provata l'app a mano nel browser.
