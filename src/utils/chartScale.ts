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

/**
 * Media dei valori senza quelli anomali verso l'alto: è anomalo un valore oltre
 * Q3 + 1,5 × (Q3 − Q1), il criterio classico dei box plot. Con meno di 4 valori
 * i quartili non hanno senso e si usa la media semplice.
 */
export function mediaSenzaAnomaliAlti(valori: number[]): number {
  const v = valori.filter(n => Number.isFinite(n)).sort((a, b) => a - b);
  if (v.length === 0) return 0;
  const media = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
  if (v.length < 4) return media(v);
  const quantile = (q: number) => {
    const pos = (v.length - 1) * q;
    const base = Math.floor(pos);
    const resto = pos - base;
    return v[base + 1] !== undefined ? v[base] + resto * (v[base + 1] - v[base]) : v[base];
  };
  const q1 = quantile(0.25);
  const q3 = quantile(0.75);
  const sogliaAnomali = q3 + 1.5 * (q3 - q1);
  return media(v.filter(n => n <= sogliaAnomali));
}

/** Arrotonda per eccesso a una cifra tonda (stesso passo usato per il minimo). */
export function arrotondaPerEccesso(valore: number): number {
  const passo = passoTondo(valore);
  return Math.ceil(valore / passo) * passo;
}
