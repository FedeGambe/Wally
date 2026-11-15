import type { EntrataRecord } from '../data/mockData';
import { getMonthIndex } from './date';
import { median } from './kpiColorScale';

/** Mesi (con uno stipendio registrato) da cui si prende la mediana. */
export const MESI_PER_MEDIANA = 6;

const chiave = (anno: number, mese: number) => anno * 12 + mese;

/**
 * Stipendio mediano da usare in Home finché quello del mese in corso non è
 * registrato: lo stipendio arriva verso metà mese, e prima di allora spendibile
 * e soglie verrebbero calcolati su entrate quasi a zero.
 *
 * Ritorna null se nel mese di `oggi` c'è già un'entrata "Stipendio" o se non
 * ci sono stipendi passati. La mediana usa gli ultimi 6 mesi con uno stipendio
 * (sommando le righe dello stesso mese), così una quattordicesima o un mese
 * strano non spostano la stima.
 */
export function stipendioMediano(entrate: EntrataRecord[] | undefined, oggi: Date = new Date()): number | null {
  const corrente = chiave(oggi.getFullYear(), oggi.getMonth());
  const perMese = new Map<number, number>();
  for (const e of entrate || []) {
    if (String(e.categoria || '').trim().toLowerCase() !== 'stipendio') continue;
    const mese = getMonthIndex(e.mese);
    if (mese < 0 || !e.anno) continue;
    const k = chiave(Number(e.anno), mese);
    perMese.set(k, (perMese.get(k) || 0) + Number(e.importo || 0));
  }
  if ((perMese.get(corrente) || 0) > 0) return null;

  const passati = [...perMese.entries()]
    .filter(([k, v]) => k < corrente && v > 0)
    .sort((a, b) => b[0] - a[0])
    .slice(0, MESI_PER_MEDIANA)
    .map(([, v]) => v);
  return passati.length ? median(passati) : null;
}

/**
 * La formula "Spendibile" del foglio Risparmio, con le soglie del mese (in %):
 * =SE(E<P; B*S; B*(P+S)-D), con B le entrate, D le primarie, E la quota delle
 * primarie, P e S le soglie di primarie e secondarie. Cioè: il budget delle
 * secondarie (S delle entrate), ridotto di quanto le primarie sforano la loro.
 * Sul foglio P e S sono scritte nella formula di ogni riga (50/20 fino a marzo
 * 2026, 35/15 da aprile, 23/22 da ottobre); l'app usa le Soglie del mese, così
 * le due cifre coincidono.
 */
export function spendibileDaFormula(entrate: number, spesePrimarie: number, primarie = 35, secondarie = 15): number {
  if (entrate <= 0) return 0;
  const p = primarie / 100;
  const s = secondarie / 100;
  if (spesePrimarie / entrate < p) return entrate * s;
  return entrate * (p + s) - spesePrimarie;
}
