# Documentazione Wally

Questa cartella spiega come è fatto il progetto, per chi lo deve mantenere senza conoscere bene React, TypeScript o FastAPI.

## Da leggere

| File | Cosa contiene |
|---|---|
| [ARCHITETTURA.md](./ARCHITETTURA.md) | Come si muovono i dati: foglio Google → backend → cache locale → schermo, e la sincronizzazione con le banche. Da leggere per primo |
| [FRONTEND.md](./FRONTEND.md) | Guida al frontend (React): ogni cartella e ogni file, a cosa serve |
| [BACKEND.md](./BACKEND.md) | Guida al backend (Python + FastAPI): ogni rotta, cartella e file, a cosa serve |
| [GUIDA-REACT-TS.md](./GUIDA-REACT-TS.md) | I concetti base di React e TypeScript usati nel progetto, con esempi presi dal codice. Parti da qui se "componente", "hook" o "props" non ti dicono niente |
| [PRODUCT.md](./PRODUCT.md) | A chi serve Wally e con quale tono parla |
| [DESIGN.md](./DESIGN.md) | Il sistema grafico: colori, caratteri, componenti, regole |

`PRODUCT.md` e `DESIGN.md` li legge anche la skill Impeccable quando lavora sull'interfaccia.

## Sito del progetto (GitHub Pages)

Questi file non sono documentazione da leggere qui: sono le pagine pubblicate online.

| File / cartella | Cosa sono |
|---|---|
| `index.html` | Pagina di presentazione di Wally |
| `documentazione.html` | Documentazione illustrata, con la demo incorporata |
| `demo/` | La demo con dati finti, generata da `npm run build:demo`. Non si modifica a mano |
| `img/` | Copertine, banner e favicon del sito |
| `progetto.json` | La scheda del progetto per il sito progetti.federicogamberini.it |

## Cos'è Wally in due righe

Una dashboard di finanza personale, per un solo utente, tutta in italiano. I dati stanno in due **fogli Google** dell'utente; il backend Python li legge e li scrive, React li mostra e li fa modificare.

## Comandi utili

```bash
npm run dev      # app in locale (http://localhost:3000), backend compreso
npm run build    # build di produzione (la usa Vercel)
npm run lint     # controllo dei tipi TypeScript
npm test         # test del frontend (Vitest)
npm run api      # solo il backend Python (porta 8000)
npm run test:py  # test del backend (pytest)
```

Dopo ogni modifica: `npm run lint`, `npm test`, `npm run test:py` se hai toccato il backend, e poi prova l'app a mano nel browser.
