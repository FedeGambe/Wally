import type { EntrataRecord } from '../data/mockData';

/**
 * Regole comuni per gli interessi dei conti (Resoconto dei Conti in
 * Investimenti e accenno in Analisi periodo di Entrate), così le due pagine
 * contano le stesse righe:
 *  - un interesse è un'Entrata con categoria "Interessi";
 *  - le cedole di iBonds/Amundi registrate come "Interessi" sono dividendi e
 *    restano fuori (stanno nel dettaglio di Trade Republic);
 *  - "Scalable CD" è Scalable, "Unicredit …" è Unicredit, ecc.
 */

export const eDividendo = (dettagli?: string) => /ibond|amundi|aumndi/i.test(dettagli || '');

export const eInteresse = (e: EntrataRecord) =>
  (e.categoria || '').trim().toLowerCase() === 'interessi' && !eDividendo(e.dettagli);

export function nomeConto(conto: string) {
  const c = (conto || '').trim();
  if (/^scalable/i.test(c)) return 'Scalable';
  if (/^unicredit/i.test(c)) return 'Unicredit';
  if (/^trade/i.test(c)) return 'Trade Republic';
  return c || 'Altro';
}
