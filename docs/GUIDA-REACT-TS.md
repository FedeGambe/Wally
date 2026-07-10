# Guida a React, TSX e TypeScript (per questo progetto)

Non è una guida generale a React: spiega solo i concetti che servono per leggere e modificare **questo** codice, con esempi presi dai file veri del progetto.

## 1. TypeScript in due parole

TypeScript è JavaScript con le "etichette dei tipi" aggiunte. Serve a far segnalare all'editor (e a `npm run lint`) un errore *prima* di eseguire il codice, invece di scoprirlo a runtime nel browser.

```ts
// JavaScript normale: nessuna garanzia su cosa sia "importo"
function formatta(importo) { return importo.toFixed(2); }

// TypeScript: dichiari che importo DEVE essere un numero.
// Se qualcuno prova a chiamare formatta("100"), l'editor segnala l'errore.
function formatta(importo: number): string { return importo.toFixed(2); }
```

### `interface`

Un `interface` descrive la forma di un oggetto: quali proprietà ha e di che tipo sono. Nel progetto, `src/data/mockData.ts` ne definisce parecchi, es.:

```ts
export interface Transaction {
  id: string;
  data: string;
  descrizione: string;
  importo: number;
  primaria: boolean;
  // ...
}
```

Da quel momento in poi, ovunque nel codice compaia `Transaction`, l'editor sa esattamente quali campi aspettarsi e segnala errore se ne manca uno o se è scritto male.

### `?` (opzionale) e `|` (unione)

```ts
sogliaAllarme?: number;   // il campo può non esserci (opzionale)
tipo: 'ETF' | 'Azioni' | 'Liquidita';  // il valore DEVE essere una di queste 3 stringhe esatte
```

### Generics e `ReturnType`

A volte serve un tipo "derivato" da qualcos'altro invece di riscriverlo a mano. In `src/context/FinanceDataContext.tsx`:

```ts
type FinanceData = ReturnType<typeof getExportableData>;
```

Questo dice: "il tipo `FinanceData` è qualunque cosa restituisca la funzione `getExportableData`". Se quella funzione cambia forma, `FinanceData` si aggiorna da solo, senza doverlo riscrivere a mano.

## 2. Componenti e JSX/TSX

Un **componente React** è semplicemente una funzione che restituisce dell'HTML (in realtà JSX, che assomiglia a HTML ma è JavaScript). I file `.tsx` sono file TypeScript che possono contenere JSX.

```tsx
function Saluto({ nome }: { nome: string }) {
  return <h1>Ciao, {nome}!</h1>;
}
```

- `{ nome }: { nome: string }` sono le **props**: i "parametri" che vengono passati al componente da chi lo usa, es. `<Saluto nome="Federico" />`.
- Le graffe `{ ... }` dentro il JSX permettono di inserire espressioni JavaScript/TypeScript in mezzo all'HTML (es. `{nome}`, oppure `{condizione && <div>...</div>}` per mostrare qualcosa solo se una condizione è vera).

Nel progetto, `src/pages/*.tsx` sono le pagine (una per voce del menu), `src/components/*.tsx` sono pezzi riusabili (bottoni, tabelle, modali), `src/subviews/*.tsx` sono le schede interne della pagina Investimenti.

## 3. Gli hook principali usati nel progetto

Gli **hook** sono funzioni speciali di React, riconoscibili perché iniziano per `use`. Vanno chiamati solo dentro un componente (o dentro un altro hook), mai in un `if` o in un ciclo.

### `useState` — una variabile che, cambiando, ridisegna lo schermo

```tsx
const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
```

`isSidebarCollapsed` è il valore attuale, `setIsSidebarCollapsed` è la funzione per cambiarlo. Ogni volta che la chiami, React ridisegna (re-render) il componente con il nuovo valore.

### `useEffect` — eseguire codice "a lato" (side effect)

```tsx
useEffect(() => {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}, [theme]);
```

Il codice dentro `useEffect` viene eseguito ogni volta che cambia uno dei valori elencati nell'array `[theme]` (l'"array delle dipendenze"). Con `[]` vuoto, viene eseguito una sola volta al montaggio del componente. Nel progetto si usa per: sincronizzare il tema col DOM, avviare l'autenticazione al caricamento dell'app, ricaricare i dati quando cambia l'access token, ecc.

### `useMemo` — ricalcolare un valore solo quando serve

```tsx
const data = useMemo(() => getExportableData(isIncognito), [isIncognito, refreshVersion]);
```

`getExportableData` è una funzione potenzialmente "costosa" (rilegge tutto). `useMemo` fa sì che venga richiamata solo quando `isIncognito` o `refreshVersion` cambiano, non ad ogni singolo render. È il meccanismo con cui `FinanceDataContext` decide *quando* la UI deve rileggere i dati (vedi [ARCHITETTURA.md](./ARCHITETTURA.md)).

### `useCallback` — la stessa idea ma per le funzioni

Evita di ricreare una funzione identica ad ogni render, utile quando quella funzione è tra le dipendenze di un `useEffect`/`useMemo` altrove (altrimenti quell'effetto scatterebbe ad ogni render).

### Custom hook: `useFinanceData`

```tsx
const { data, isIncognito, refreshData } = useFinanceData();
```

Non è un hook di React "di fabbrica": è definito in `src/context/FinanceDataContext.tsx` ed è la porta d'accesso ai dati finanziari da qualunque pagina/componente. Sotto il cofano usa `useContext` (vedi punto 4). Ogni `hooks/use*Data.ts` del progetto (es. `useEntrateData.ts`) è a sua volta un custom hook che usa `useFinanceData()` e ci fa sopra filtri/calcoli specifici di una pagina.

## 4. Context — passare dati senza "prop-drilling"

Normalmente i dati passano da un componente all'altro tramite props, di padre in figlio. Se un dato serve a componenti molto annidati, passarlo attraverso ogni livello intermedio (anche se quel livello non lo usa) si chiama "prop-drilling" ed è scomodo.

Il **Context** risolve questo: un componente `Provider` in alto nell'albero "espone" un valore, e qualunque discendente (a qualunque livello di profondità) può leggerlo con `useContext`, senza che i componenti intermedi debbano saperne nulla.

Nel progetto, `FinanceDataProvider` (in `App.tsx`) avvolge tutta la dashboard; ogni pagina chiama `useFinanceData()` per leggere i dati, senza che `App.tsx` debba passarli esplicitamente ad ognuna.

## 5. TypeScript + JSX: `any` e perché a volte compare

Nel codice trovi spesso `any` (es. `scalable?: any[]`). Significa "disattiva il controllo dei tipi per questo valore": comodo quando la forma esatta dei dati non è nota a priori (es. colonne dinamiche lette da Google Sheets), ma va usato con parsimonia perché toglie a TypeScript la possibilità di segnalarti errori su quel valore.

## 6. Import/export

```ts
export const TARGET_PRIMARIE = 35;       // esporta un valore, altri file possono importarlo
import { TARGET_PRIMARIE } from './targets';  // lo importa
export default function App() { ... }    // "export default": un solo export principale per file
```

`export` normale permette più esportazioni per file (con nome); `export default` ne permette una sola per file e chi importa può darle il nome che vuole (`import App from './App'` — il nome `App` qui è arbitrario).
