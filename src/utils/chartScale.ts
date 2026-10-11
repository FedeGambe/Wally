// Calcolo della scala dell'asse Y per i grafici storici di Entrate e Uscite:
// invece di partire da 0 l'asse parte poco sotto il valore più basso, così le
// variazioni da un mese all'altro si leggono meglio.

/** Passo "tondo" per arrotondare i limiti dell'asse: un decimo dell'ordine di
 * grandezza (2.000 € → 100, 300 € → 10), mai sotto 10. */
function passoTondo(valore: number): number {
  if (valore <= 0) return 10;
  return Math.max(10, Math.pow(10, Math.floor(Math.log10(valore))) / 10);
}

const SCARTO_MIN = 0.15; // margine sotto il minimo: 15% della distanza tra minimo e massimo

/**
 * Minimo dell'asse Y: valore più basso meno uno scarto, arrotondato per difetto
 * a una cifra tonda e mai sotto 0. `maxVisibile` è il tetto dell'asse quando
 * il grafico taglia i valori anomali (Uscite): lo scarto va calcolato sulla
 * parte di grafico che si vede, non fino al mese anomalo.
 */
export function minimoAsseConScarto(valori: number[], maxVisibile?: number): number {
  const v = valori.filter(n => Number.isFinite(n));
  if (v.length === 0) return 0;
  const min = Math.min(...v);
  const max = maxVisibile ?? Math.max(...v);
  if (min <= 0) return 0;
  // Se tutti i valori sono uguali, lo scarto si calcola sul valore stesso.
  const scarto = (max - min || min) * SCARTO_MIN;
  const passo = passoTondo(max);
  return Math.max(0, Math.floor((min - scarto) / passo) * passo);
}
