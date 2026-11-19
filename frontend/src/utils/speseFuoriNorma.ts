import type { Transaction } from '../data/mockData';
import { getMonthIndex, getTransactionYear } from './date';

/**
 * Spese fuori dal normale: per un mese, le categorie in cui si è speso molto
 * più del solito rispetto ai 12 mesi prima. Due casi, perché le categorie si
 * comportano in modo diverso:
 *
 *  - RICORRENTI (spesa in almeno 6 dei 12 mesi prima: Bar, Bici, Rifornimento,
 *    Assicurazione...): il "solito" è la mediana dei 12 mesi (i mesi a zero
 *    contano); fuori dal normale se si supera la mediana di almeno
 *    3 × lo scarto tipico (MAD), 40 € e metà della mediana. I tre minimi
 *    insieme evitano segnalazioni per pochi euro o su categorie molto regolari.
 *  - OCCASIONALI (meno di 6 mesi su 12: Pneumatici, Alloggio, Scarpe...):
 *    una spesa saltuaria da 70 € è normale; si segnala solo da 100 € in su e
 *    oltre 1,25 × il mese più alto dei 12 mesi prima (o la prima volta).
 *
 * Provato sui dati veri (ott 2025 → nov 2026): circa una segnalazione al mese,
 * tutte spese davvero insolite (auto e assicurazione a settembre 2026, bici a
 * ottobre, alloggio delle vacanze, gomme, manutenzione straordinaria).
 * PAC, trasferimenti e correttivi restano fuori. Il mese in corso si confronta
 * così com'è: se è già sopra il solito a metà mese lo è davvero.
 */

const MACRO_ESCLUSE = new Set(['movimenti', 'correttivo']);
const MESI_STORIA = 12;
const MESI_PER_RICORRENTE = 6;
const MINIMO_EURO = 40;
const MINIMO_OCCASIONALE = 100;
const MAD_A_SIGMA = 1.4826;

export interface SpesaFuoriNorma {
  macroCategoria: string;
  categoria: string;
  /** Speso nel mese. */
  importo: number;
  /** Ricorrente: la mediana dei 12 mesi prima. Occasionale: il mese più alto. */
  riferimento: number;
  tipo: 'ricorrente' | 'occasionale';
  /** In quanti dei 12 mesi prima c'è stata una spesa. */
  mesiConSpesa: number;
  /** Quanto in più rispetto al riferimento. */
  differenza: number;
  /** I movimenti del mese, dal più grande. */
  movimenti: Transaction[];
}

/** anno * 12 + mese (0-11), come usePeriodoAnalisi. */
export function chiaveMeseTransazione(t: Transaction): number | null {
  const anno = getTransactionYear(t);
  const mese = getMonthIndex(t.mese);
  if (mese !== -1) return anno * 12 + mese;
  const parti = String(t.data || '').split(/[\/\-]/);
  if (parti.length === 3) {
    const m = parseInt(parti[1], 10) - 1; // gg/mm/aaaa e aaaa-mm-gg: il mese è al centro
    if (m >= 0 && m < 12) return anno * 12 + m;
  }
  return null;
}

function mediana(valori: number[]): number {
  if (!valori.length) return 0;
  const v = [...valori].sort((a, b) => a - b);
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

/** Le spese fuori dal normale del mese `chiave`, dalla differenza più grande. */
export function speseFuoriNorma(uscite: Transaction[], chiave: number): SpesaFuoriNorma[] {
  // Totali per categoria e mese, solo nella finestra che serve.
  const perCategoria = new Map<string, { macro: string; categoria: string; mesi: Map<number, number>; movimenti: Transaction[] }>();
  for (const t of uscite) {
    const macro = (t.macroCategoria || '').trim();
    const categoria = (t.categoria || '').trim();
    if (!categoria || MACRO_ESCLUSE.has(macro.toLowerCase())) continue;
    const k = chiaveMeseTransazione(t);
    if (k === null || k < chiave - MESI_STORIA || k > chiave) continue;
    const id = `${macro}\u0000${categoria}`;
    let c = perCategoria.get(id);
    if (!c) perCategoria.set(id, c = { macro, categoria, mesi: new Map(), movimenti: [] });
    c.mesi.set(k, (c.mesi.get(k) || 0) + (Number(t.importo) || 0));
    if (k === chiave) c.movimenti.push(t);
  }

  const trovate: SpesaFuoriNorma[] = [];
  for (const c of perCategoria.values()) {
    const importo = c.mesi.get(chiave) || 0;
    if (importo <= 0) continue;
    const storia = Array.from({ length: MESI_STORIA }, (_, i) => c.mesi.get(chiave - MESI_STORIA + i) || 0);
    const mesiConSpesa = storia.filter(v => v > 0).length;
    let riferimento: number;
    let tipo: SpesaFuoriNorma['tipo'];
    if (mesiConSpesa >= MESI_PER_RICORRENTE) {
      tipo = 'ricorrente';
      riferimento = mediana(storia);
      const scarto = mediana(storia.map(v => Math.abs(v - riferimento))) * MAD_A_SIGMA;
      if (importo <= riferimento + Math.max(3 * scarto, MINIMO_EURO, 0.5 * riferimento)) continue;
    } else {
      tipo = 'occasionale';
      riferimento = Math.max(...storia);
      if (importo < MINIMO_OCCASIONALE || importo <= 1.25 * riferimento) continue;
    }
    trovate.push({
      macroCategoria: c.macro,
      categoria: c.categoria,
      importo,
      riferimento,
      tipo,
      mesiConSpesa,
      differenza: importo - riferimento,
      movimenti: [...c.movimenti].sort((a, b) => (Number(b.importo) || 0) - (Number(a.importo) || 0))
    });
  }
  return trovate.sort((a, b) => b.differenza - a.differenza);
}
