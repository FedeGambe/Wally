import { useMemo, useState } from 'react';
import { MESI_ABBREVIATI } from '../utils/date';

/**
 * Periodo delle schede "Analisi periodo" (Uscite ed Entrate): ultimi 12 mesi,
 * un anno, tutto, o da/a. I mesi sono numeri progressivi (anno*12 + mese,
 * 0 = gennaio) così intervalli e confronti sono semplici sottrazioni. I mesi
 * futuri restano fuori.
 */

/** 'ultimi12' | 'tutto' | 'personalizzato' | 'anno-2025' … */
export type PeriodoAnalisi = string;

export const chiaveMese = (anno: number, mese: number) => anno * 12 + mese;
export const etichettaMese = (k: number) => `${MESI_ABBREVIATI[k % 12]} '${String(Math.floor(k / 12)).slice(2)}`;
export const aInputMese = (k: number) => `${Math.floor(k / 12)}-${String((k % 12) + 1).padStart(2, '0')}`;
/** "2025-03" (input type=month) → chiave; vuoto o non valido → null. */
const daInputMese = (s: string): number | null => {
  const m = /^(\d{4})-(\d{2})$/.exec(s);
  return m ? chiaveMese(+m[1], +m[2] - 1) : null;
};

export function meseCorrenteChiave() {
  const oggi = new Date();
  return chiaveMese(oggi.getFullYear(), oggi.getMonth());
}

/** `chiavi`: i mesi in cui ci sono dati (già senza i mesi futuri). */
export function usePeriodoAnalisi(chiavi: number[]) {
  const meseCorrente = meseCorrenteChiave();

  const [periodo, setPeriodo] = useState<PeriodoAnalisi>('ultimi12');
  const [da, setDa] = useState(aInputMese(meseCorrente - 11));
  const [a, setA] = useState(aInputMese(meseCorrente));

  const primoMese = useMemo(() => chiavi.reduce((m, k) => Math.min(m, k), meseCorrente), [chiavi, meseCorrente]);

  const anni = useMemo(() => {
    const s = new Set(chiavi.map(k => Math.floor(k / 12)));
    return Array.from(s).sort((x, y) => y - x);
  }, [chiavi]);

  // Intervallo [inizio, fine] in chiavi mese, estremi inclusi.
  const [inizio, fine] = useMemo((): [number, number] => {
    if (periodo === 'tutto') return [primoMese, meseCorrente];
    if (periodo.startsWith('anno-')) {
      const anno = parseInt(periodo.slice(5), 10);
      return [chiaveMese(anno, 0), Math.min(chiaveMese(anno, 11), meseCorrente)];
    }
    if (periodo === 'personalizzato') {
      const x = daInputMese(da) ?? primoMese;
      const y = Math.min(daInputMese(a) ?? meseCorrente, meseCorrente);
      return x <= y ? [x, y] : [y, x];
    }
    return [meseCorrente - 11, meseCorrente];
  }, [periodo, da, a, primoMese, meseCorrente]);

  const numeroMesi = fine - inizio + 1;

  const etichettaPeriodo = useMemo(() => {
    const fmt = (k: number) => `${MESI_ABBREVIATI[k % 12]} ${Math.floor(k / 12)}`;
    return inizio === fine ? fmt(inizio) : `${fmt(inizio)} – ${fmt(fine)}`;
  }, [inizio, fine]);

  // Voci del menu Periodo.
  const periodi: [string, string][] = useMemo(() => [
    ['ultimi12', 'Ultimi 12 mesi'],
    ...anni.map(x => [`anno-${x}`, String(x)] as [string, string]),
    ['tutto', 'Tutto'],
    ['personalizzato', 'Da… a…']
  ], [anni]);

  return {
    periodo, setPeriodo, da, setDa, a, setA, anni, periodi,
    minInput: aInputMese(primoMese), maxInput: aInputMese(meseCorrente),
    meseCorrente, primoMese, inizio, fine, numeroMesi, etichettaPeriodo,
    /** Il periodo subito prima, lungo uguale, esiste per intero nei dati. */
    precedenteCompleto: primoMese <= inizio - numeroMesi
  };
}
