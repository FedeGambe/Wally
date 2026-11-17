import type { Transaction } from '../data/mockData';
import { dataTransazioneMs } from './date';

/**
 * Filtri delle tabelle di uscite (archivio del mese in Uscite e analisi sul
 * periodo). Stringa vuota = nessun filtro su quella colonna. Condivisi fra la
 * tabella (filtri di colonna) e il resto della pagina, così torte, grafico e
 * KPI dell'analisi guardano esattamente le stesse righe della tabella.
 */
export interface FiltriUscite {
  /** Ricerca libera su descrizione, categoria e macro categoria. */
  testo: string;
  /** Contiene: es. "03/2025" o "14/". */
  data: string;
  descrizione: string;
  macro: string;
  categoria: string;
  conto: string;
  tipo: '' | 'primarie' | 'secondarie';
  importoMin: string;
  importoMax: string;
}

export const FILTRI_USCITE_VUOTI: FiltriUscite = {
  testo: '', data: '', descrizione: '', macro: '', categoria: '', conto: '', tipo: '', importoMin: '', importoMax: ''
};

export type ColonnaUscite = 'data' | 'descrizione' | 'macro' | 'categoria' | 'importo' | 'conto' | 'tipo';
export interface OrdinamentoUscite { colonna: ColonnaUscite; verso: 'asc' | 'desc' }
export const ORDINAMENTO_USCITE_DEFAULT: OrdinamentoUscite = { colonna: 'data', verso: 'desc' };

function numero(s: string): number | null {
  if (!s.trim()) return null;
  const n = parseFloat(s.replace(',', '.'));
  return isNaN(n) ? null : n;
}

/** Applica i filtri; `ignora` esclude alcune colonne (es. le torte ignorano il proprio filtro). */
export function filtraUscite(transazioni: Transaction[], f: FiltriUscite, ignora: (keyof FiltriUscite)[] = []): Transaction[] {
  const usa = (k: keyof FiltriUscite) => !ignora.includes(k) && f[k] !== '';
  const testo = f.testo.toLowerCase();
  const descr = f.descrizione.toLowerCase();
  const min = usa('importoMin') ? numero(f.importoMin) : null;
  const max = usa('importoMax') ? numero(f.importoMax) : null;
  return transazioni.filter(t => {
    if (usa('testo') && !`${t.descrizione} ${t.categoria} ${t.macroCategoria}`.toLowerCase().includes(testo)) return false;
    if (usa('data') && !String(t.data || '').includes(f.data.trim())) return false;
    if (usa('descrizione') && !String(t.descrizione || '').toLowerCase().includes(descr)) return false;
    if (usa('macro') && (t.macroCategoria || 'Altro') !== f.macro) return false;
    if (usa('categoria') && (t.categoria || 'Altro') !== f.categoria) return false;
    if (usa('conto') && t.conto !== f.conto) return false;
    if (usa('tipo') && (f.tipo === 'primarie') !== !!t.primaria) return false;
    if (min !== null && t.importo < min) return false;
    if (max !== null && t.importo > max) return false;
    return true;
  });
}

export function ordinaUscite(transazioni: Transaction[], o: OrdinamentoUscite): Transaction[] {
  const segno = o.verso === 'asc' ? 1 : -1;
  const testo = (a: string, b: string) => (a || '').localeCompare(b || '', 'it', { sensitivity: 'base' });
  return [...transazioni].sort((a, b) => {
    let c = 0;
    switch (o.colonna) {
      case 'data': c = dataTransazioneMs(a.data) - dataTransazioneMs(b.data); break;
      case 'descrizione': c = testo(a.descrizione, b.descrizione); break;
      case 'macro': c = testo(a.macroCategoria, b.macroCategoria); break;
      case 'categoria': c = testo(a.categoria, b.categoria); break;
      case 'importo': c = a.importo - b.importo; break;
      case 'conto': c = testo(a.conto, b.conto); break;
      case 'tipo': c = Number(!!a.primaria) - Number(!!b.primaria); break;
    }
    // A parità, sempre dal più recente.
    return c * segno || dataTransazioneMs(b.data) - dataTransazioneMs(a.data);
  });
}

export function filtriUsciteAttivi(f: FiltriUscite, ignora: (keyof FiltriUscite)[] = []): number {
  return (Object.keys(f) as (keyof FiltriUscite)[]).filter(k => !ignora.includes(k) && f[k] !== '').length;
}
