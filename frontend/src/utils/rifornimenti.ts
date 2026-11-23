import { toDate } from '../hooks/useAnalisiConsumiData';

/** Categoria delle uscite che corrispondono a un rifornimento (Automobile › Rifornimento). */
export const CATEGORIA_RIFORNIMENTO = 'Rifornimento';

export const isUscitaRifornimento = (categoria: string): boolean =>
  categoria.trim().toLowerCase() === CATEGORIA_RIFORNIMENTO.toLowerCase();

const GIORNO_MS = 24 * 60 * 60 * 1000;

/**
 * Dice se il rifornimento di un'uscita è già registrato in Analisi Consumi.
 *
 * Riceve: l'elenco dei consumi (righe del foglio, data "gg/mm/aaaa"), la data
 * dell'uscita ("gg/mm/aaaa") e il suo importo.
 * Restituisce: true se c'è un consumo lo stesso giorno, oppure entro 3 giorni
 * con un costo uguale a meno di 50 centesimi (i movimenti della banca a volte
 * arrivano un giorno o due dopo il pieno).
 *
 * Esempio: consumo del 20/11/2026 da 40 €, uscita del 21/11/2026 da 40 € → true.
 */
export function consumoGiaRegistrato(
  consumi: { data?: string; costo?: number | string }[],
  dataUscita: string,
  importo: number
): boolean {
  const giorno = toDate(dataUscita);
  if (!giorno) return false;
  return consumi.some(c => {
    const d = toDate(String(c?.data || ''));
    if (!d) return false;
    const distanza = Math.abs(Math.round((d.getTime() - giorno.getTime()) / GIORNO_MS));
    if (distanza === 0) return true;
    return distanza <= 3 && Math.abs(Number(c.costo || 0) - importo) < 0.5;
  });
}
