import { toValidFieldName } from './sheetsUtils';
import { parseLocalizedNumber } from '../lib/sheetsService';
import { MESI_ITALIANI } from './date';

/**
 * Helper condivisi tra l'editor "Investimenti Ricorrenti" (Impostazioni) e il
 * form che li inserisce (Aggiungi Dato → Investimenti Ricorrenti). I nomi dei
 * broker coincidono coi nomi dei tab del foglio principale.
 */
export const BROKER_INVESTIMENTI = ['Scalable', 'Trade Republic'] as const;

interface DatiBroker {
  scalable?: any[];
  tradeRepublic?: any[];
  scalableFields?: string[];
  scalableHeaders?: string[];
  tradeRepublicFields?: string[];
  tradeRepublicHeaders?: string[];
  scalableColumnCategories?: Record<string, string>;
  tradeRepublicColumnCategories?: Record<string, string>;
}

const datiDelBroker = (data: DatiBroker, broker: string) => broker === 'Scalable'
  ? { rows: data.scalable || [], fields: data.scalableFields || [], headers: data.scalableHeaders || [], categorie: data.scalableColumnCategories || {} }
  : { rows: data.tradeRepublic || [], fields: data.tradeRepublicFields || [], headers: data.tradeRepublicHeaders || [], categorie: data.tradeRepublicColumnCategories || {} };

// Strumenti = colonne del tab broker con un'asset class in riga 2
// (Azioni/Obbligazioni/Monetario), rilevate al pull da fetchSpreadsheetData.
export function strumentiBroker(data: DatiBroker, broker: string): string[] {
  const { fields, headers, categorie } = datiDelBroker(data, broker);
  return fields
    .map((f, i) => (categorie[f] ? headers[i] : ''))
    .filter(Boolean);
}

// Etichetta del mese come appare in colonna A dei tab broker ("ottobre 2026").
export function meseLabelBroker(date: Date): string {
  return `${MESI_ITALIANI[date.getMonth()].toLowerCase()} ${date.getFullYear()}`;
}

// Importo già presente (dall'ultimo pull) nella cella mese×strumento: 0 se vuota.
export function importoGiaInserito(data: DatiBroker, broker: string, strumento: string, meseLabel: string): number {
  const { rows } = datiDelBroker(data, broker);
  const riga = rows.find(r => String(r.mese || '').trim().toLowerCase() === meseLabel);
  if (!riga) return 0;
  return parseLocalizedNumber(riga[toValidFieldName(strumento)]);
}

// Valore numerico (dall'ultimo pull) di un campo della riga del mese, es.
// saldoConto di "ottobre 2026"; null se la riga manca o la cella è vuota/zero.
export function valoreCampoBroker(data: DatiBroker, broker: string, campo: string, meseLabel: string): number | null {
  const { rows } = datiDelBroker(data, broker);
  const riga = rows.find(r => String(r.mese || '').trim().toLowerCase() === meseLabel);
  if (!riga) return null;
  const valore = parseLocalizedNumber(riga[campo]);
  return valore !== 0 ? valore : null;
}
