/**
 * Soglie percentuali "target" (obiettivo) di allocazione del reddito, usate come default
 * quando il foglio Google Sheet non specifica soglie proprie (vedi src/utils/thresholds.ts,
 * che le legge dalle intestazioni del foglio "Panoramica" e ricade su questi valori come
 * fallback). Rappresentano quanto % delle entrate dovrebbe andare a: spese primarie
 * (necessarie), spese secondarie (discrezionali), investimenti, risparmio.
 * Cambiare questi numeri cambia solo il default: se il foglio ha le sue soglie, quelle vincono.
 */
export const TARGET_PRIMARIE = 35;
export const TARGET_SECONDARIE = 15;
export const TARGET_INVESTIMENTI = 25;

// Il risparmio è ciò che resta del 100% dopo primarie+secondarie+investimenti
// (le 4 categorie devono sommare a 100%).
export const TARGET_RISPARMIO =
  100 - TARGET_PRIMARIE - TARGET_SECONDARIE - TARGET_INVESTIMENTI;

// "Netto" = quota che va ad accantonamento in senso lato (investimenti + risparmio),
// cioè il complementare delle spese (primarie + secondarie).
export const TARGET_NETTO =
  TARGET_INVESTIMENTI + TARGET_RISPARMIO;
