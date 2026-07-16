/**
 * Soglie percentuali target per spese primarie/secondarie/investimenti/risparmio/netto,
 * usate da usePanoramicaData.ts per colorare le card KPI della pagina Panoramica.
 * Priorità delle fonti (dalla più alta alla più bassa):
 *  1. `soglie` (Impostazioni → Dati Base → Soglie, vedi src/data/mockData.ts) — editabile
 *     dall'utente in app, sincronizzata col tab "Soglie" del foglio Google.
 *  2. Gli header del foglio "Risparmio" (vecchio meccanismo: es. "35%" scritto
 *     nell'intestazione), per compatibilità con fogli non ancora migrati a un tab Soglie.
 *  3. I valori di default in src/config/targets.tsx.
 */
import {
  TARGET_PRIMARIE,
  TARGET_SECONDARIE,
  TARGET_INVESTIMENTI,
  TARGET_RISPARMIO,
  TARGET_NETTO,
} from "../config/targets";
import type { Soglia } from "../data/mockData";

const normalize = (value: string) => value.toLowerCase().trim();

// Cerca in `soglie` una categoria il cui nome contiene `keyword` (es. "prim" per
// "Spese Primarie"), ritorna undefined se `soglie` è vuoto o non c'è match.
const findInSoglie = (soglie: Soglia[] | undefined, keyword: string): number | undefined => {
  if (!soglie || soglie.length === 0) return undefined;
  const found = soglie.find((s) => normalize(s.categoria).includes(keyword));
  return found ? found.percentuale : undefined;
};

/**
 * Trova in che colonna (indice) del foglio si trova la soglia cercata, provando 3 strategie
 * in ordine dal più preciso al più approssimativo, perché l'intestazione del foglio Google
 * potrebbe essere scritta in modi diversi (es. "35%" oppure "Target Primarie" seguito da "35%").
 */
const findHeaderIndex = (
  headers: string[],
  target: number,
  keyword: string,
  fallback: number
) => {
  // 1. Cerca una colonna il cui testo è esattamente il numero target (es. "35" o "35%")
  const targetStr = String(target);

  let index = headers.findIndex((h) => {
    const text = normalize(h).replace("%", "");
    return text === targetStr;
  });

  if (index >= 0) {
    return index;
  }

  // 2. Cerca una colonna che contiene la keyword (es. "prim" per "Primarie") e assume che
  //    il valore della soglia sia nella colonna subito successiva.
  index = headers.findIndex((h) => normalize(h).includes(keyword));

  if (index >= 0 && index + 1 < headers.length) {
    return index + 1;
  }

  // 3. Fallback: nessuna delle due strategie ha funzionato, si usa la posizione fissa
  //    che la colonna occupa di solito nel layout standard del foglio.
  return fallback;
};


/**
 * Estrae un numero (soglia %) dal testo di una cella header, es. "35%" o "35" -> 35.
 * Gestisce sia la virgola decimale italiana (35,5) che il punto (35.5).
 * Se non trova nessun numero, ritorna il valore di default passato.
 */
const parseThreshold = (headerString: string, fallback: number): number => {
  if (!headerString) return fallback;
  const pctMatch = headerString.match(/(\d+(?:[.,]\d+)?)\s*%/);
  if (pctMatch) {
    return parseFloat(pctMatch[1].replace(',', '.'));
  }
  const numMatch = headerString.match(/(\d+(?:[.,]\d+)?)/);
  if (numMatch) {
    return parseFloat(numMatch[1].replace(',', '.'));
  }
  return fallback;
};

export const getThresholds = (headers: string[], soglie?: Soglia[]) => {
  // I numeri di fallback (4, 6, 9, 10/11, 12/13) sono le posizioni di colonna attese nel
  // layout standard del foglio "Panoramica", usate solo se le due ricerche sopra falliscono.
  const primarieIndex = findHeaderIndex(
    headers,
    TARGET_PRIMARIE,
    "prim",
    4
  );

  const secondarieIndex = findHeaderIndex(
    headers,
    TARGET_SECONDARIE,
    "sec",
    6
  );

  const investitiIndex = findHeaderIndex(
    headers,
    TARGET_INVESTIMENTI,
    "invest",
    9
  );

  // Se esiste una colonna 11 (indice 11) la usiamo, altrimenti la 10: il foglio può avere
  // o non avere una colonna extra prima di "Risparmio" a seconda di quante colonne sono compilate.
  const risparmioIndex = findHeaderIndex(
    headers,
    TARGET_RISPARMIO,
    "risp",
    headers[11] ? 11 : 10
  );

  const nettoIndex = findHeaderIndex(
    headers,
    TARGET_NETTO,
    "netto",
    headers[13] ? 13 : 12
  );

  const investiti = findInSoglie(soglie, "invest") ?? parseThreshold(headers[investitiIndex], TARGET_INVESTIMENTI);
  const risparmio = findInSoglie(soglie, "risp") ?? parseThreshold(headers[risparmioIndex], TARGET_RISPARMIO);

  return {
    primarie: findInSoglie(soglie, "prim") ?? parseThreshold(headers[primarieIndex], TARGET_PRIMARIE),
    secondarie: findInSoglie(soglie, "sec") ?? parseThreshold(headers[secondarieIndex], TARGET_SECONDARIE),
    investiti,
    risparmio,
    // "Netto" non ha una propria categoria in Soglie (è per definizione investimenti+risparmio,
    // vedi TARGET_NETTO in targets.tsx): se entrambe vengono da Soglie lo ricalcoliamo, altrimenti
    // resta l'header/default come per gli altri campi.
    totali: (findInSoglie(soglie, "invest") !== undefined && findInSoglie(soglie, "risp") !== undefined)
      ? investiti + risparmio
      : parseThreshold(headers[nettoIndex], TARGET_NETTO),
  };
};