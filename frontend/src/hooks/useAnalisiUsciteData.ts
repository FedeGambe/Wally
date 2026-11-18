import { useMemo, useState } from 'react';
import type { Transaction } from '../data/mockData';
import { useFinanceData } from '../context/FinanceDataContext';
import { MESI_ABBREVIATI, getMonthIndex, getTransactionYear } from '../utils/date';
import { FILTRI_USCITE_VUOTI, FiltriUscite, filtraUscite } from '../utils/filtriUscite';

/**
 * Calcoli della scheda "Analisi" di Uscite: le uscite su un periodo a scelta
 * (ultimi 12 mesi, un anno, tutto, o da/a), con gli stessi filtri della
 * tabella. Serve per domande tipo "quanto ho speso di rifornimenti nel 2025":
 * totale, media al mese, andamento mese per mese (o anno per anno), confronto
 * col periodo precedente della stessa lunghezza e ripartizione per categoria.
 * I mesi futuri (ricorrenti già scritte nel foglio) restano fuori.
 */

/** 'ultimi12' | 'tutto' | 'personalizzato' | 'anno-2025' … */
export type PeriodoUscite = string;

/** Mese come numero progressivo: anno*12 + indice mese (0 = gennaio). */
const chiaveMese = (anno: number, mese: number) => anno * 12 + mese;
const etichettaMese = (k: number) => `${MESI_ABBREVIATI[k % 12]} '${String(Math.floor(k / 12)).slice(2)}`;
/** "2025-03" (input type=month) → chiave; vuoto o non valido → null. */
const daInputMese = (s: string): number | null => {
  const m = /^(\d{4})-(\d{2})$/.exec(s);
  return m ? chiaveMese(+m[1], +m[2] - 1) : null;
};
export const aInputMese = (k: number) => `${Math.floor(k / 12)}-${String((k % 12) + 1).padStart(2, '0')}`;

function chiaveTransazione(t: Transaction): number | null {
  const mese = getMonthIndex(t.mese);
  if (mese !== -1) return chiaveMese(getTransactionYear(t), mese);
  const parti = String(t.data || '').split(/[\/\-]/);
  if (parti.length === 3) {
    const m = parseInt(parti[1], 10) - 1; // gg/mm/aaaa e aaaa-mm-gg: il mese è sempre al centro
    if (m >= 0 && m < 12) return chiaveMese(getTransactionYear(t), m);
  }
  return null;
}

const somma = (txs: Transaction[]) => txs.reduce((s, t) => s + (Number(t.importo) || 0), 0);

export interface PuntoAndamento {
  etichetta: string;
  primarie: number;
  secondarie: number;
  totale: number;
  movimenti: number;
}

export function useAnalisiUsciteData() {
  const { data } = useFinanceData();
  const oggi = new Date();
  const meseCorrente = chiaveMese(oggi.getFullYear(), oggi.getMonth());

  const [periodo, setPeriodo] = useState<PeriodoUscite>('ultimi12');
  const [da, setDa] = useState(aInputMese(meseCorrente - 11));
  const [a, setA] = useState(aInputMese(meseCorrente));
  const [filtri, setFiltri] = useState<FiltriUscite>(FILTRI_USCITE_VUOTI);
  const [raggruppa, setRaggruppa] = useState<'mese' | 'anno'>('mese');

  // Uscite con il loro mese, senza i mesi futuri.
  const conChiave = useMemo(() => (data.uscite || [])
    .map(t => ({ t, k: chiaveTransazione(t) }))
    .filter((x): x is { t: Transaction; k: number } => x.k !== null && x.k <= meseCorrente),
  [data.uscite, meseCorrente]);

  const primoMese = useMemo(() => conChiave.reduce((m, x) => Math.min(m, x.k), meseCorrente), [conChiave, meseCorrente]);

  const anni = useMemo(() => {
    const s = new Set(conChiave.map(x => Math.floor(x.k / 12)));
    return Array.from(s).sort((x, y) => y - x);
  }, [conChiave]);

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

  const nelPeriodo = useMemo(() => conChiave.filter(x => x.k >= inizio && x.k <= fine), [conChiave, inizio, fine]);
  const transazioniPeriodo = useMemo(() => nelPeriodo.map(x => x.t), [nelPeriodo]);
  const filtrate = useMemo(() => new Set(filtraUscite(transazioniPeriodo, filtri)), [transazioniPeriodo, filtri]);
  const righeFiltrate = useMemo(() => nelPeriodo.filter(x => filtrate.has(x.t)), [nelPeriodo, filtrate]);

  const totale = useMemo(() => somma(righeFiltrate.map(x => x.t)), [righeFiltrate]);
  const primarie = useMemo(() => somma(righeFiltrate.filter(x => x.t.primaria).map(x => x.t)), [righeFiltrate]);

  const andamentoMensile = useMemo((): (PuntoAndamento & { chiave: number })[] => {
    const punti = new Map<number, PuntoAndamento & { chiave: number }>();
    for (let k = inizio; k <= fine; k++) {
      punti.set(k, { chiave: k, etichetta: etichettaMese(k), primarie: 0, secondarie: 0, totale: 0, movimenti: 0 });
    }
    righeFiltrate.forEach(({ t, k }) => {
      const p = punti.get(k)!;
      const v = Number(t.importo) || 0;
      if (t.primaria) p.primarie += v; else p.secondarie += v;
      p.totale += v;
      p.movimenti += 1;
    });
    return Array.from(punti.values());
  }, [righeFiltrate, inizio, fine]);

  const andamentoAnnuale = useMemo((): (PuntoAndamento & { mesi: number })[] => {
    const perAnno = new Map<number, PuntoAndamento & { mesi: number }>();
    andamentoMensile.forEach(p => {
      const anno = Math.floor(p.chiave / 12);
      const q = perAnno.get(anno) ?? { etichetta: String(anno), primarie: 0, secondarie: 0, totale: 0, movimenti: 0, mesi: 0 };
      q.primarie += p.primarie; q.secondarie += p.secondarie; q.totale += p.totale; q.movimenti += p.movimenti; q.mesi += 1;
      perAnno.set(anno, q);
    });
    return Array.from(perAnno.values());
  }, [andamentoMensile]);

  const piuAnni = andamentoAnnuale.length > 1;
  const andamento: PuntoAndamento[] = raggruppa === 'anno' && piuAnni ? andamentoAnnuale : andamentoMensile;

  const mesePiuAlto = useMemo(() => andamentoMensile.reduce<(typeof andamentoMensile)[number] | null>(
    (m, p) => (p.totale > 0 && (!m || p.totale > m.totale) ? p : m), null), [andamentoMensile]);

  // Stesso numero di mesi subito prima; solo se i dati coprono tutto quel periodo,
  // altrimenti il confronto sarebbe falsato da mesi mancanti.
  const precedente = useMemo(() => {
    const pInizio = inizio - numeroMesi;
    const pFine = inizio - 1;
    if (primoMese > pInizio) return null;
    const txs = conChiave.filter(x => x.k >= pInizio && x.k <= pFine).map(x => x.t);
    return { totale: somma(filtraUscite(txs, filtri)), inizio: pInizio, fine: pFine };
  }, [conChiave, inizio, numeroMesi, primoMese, filtri]);

  // Card Totali / Primarie / Secondarie: ignorano il filtro tipo (sono loro a
  // sceglierlo), così si vedono sempre tutte e tre le cifre.
  const perTipo = useMemo(() => {
    const dividi = (txs: Transaction[]) => {
      const primarie = somma(txs.filter(t => t.primaria));
      const totale = somma(txs);
      return { totale, primarie, secondarie: totale - primarie };
    };
    const attuale = dividi(filtraUscite(transazioniPeriodo, filtri, ['tipo']));
    let prima: ReturnType<typeof dividi> | undefined;
    if (primoMese <= inizio - numeroMesi) {
      const txs = conChiave.filter(x => x.k >= inizio - numeroMesi && x.k < inizio).map(x => x.t);
      prima = dividi(filtraUscite(txs, filtri, ['tipo']));
    }
    return { attuale, prima };
  }, [transazioniPeriodo, conChiave, filtri, inizio, numeroMesi, primoMese]);

  // Le torte ignorano il proprio filtro (come in Uscite: la fetta scelta resta
  // evidenziata e le altre si vedono ancora).
  const perMacro = useMemo(() => raggruppaPer(filtraUscite(transazioniPeriodo, filtri, ['macro', 'categoria']), t => t.macroCategoria || 'Altro'), [transazioniPeriodo, filtri]);
  const perCategoria = useMemo(() => raggruppaPer(filtraUscite(transazioniPeriodo, filtri, ['categoria']), t => t.categoria || 'Altro'), [transazioniPeriodo, filtri]);

  const etichettaPeriodo = useMemo(() => {
    const fmt = (k: number) => `${MESI_ABBREVIATI[k % 12]} ${Math.floor(k / 12)}`;
    return inizio === fine ? fmt(inizio) : `${fmt(inizio)} – ${fmt(fine)}`;
  }, [inizio, fine]);

  return {
    periodo, setPeriodo, da, setDa, a, setA, anni,
    minInput: aInputMese(primoMese), maxInput: aInputMese(meseCorrente),
    filtri, setFiltri,
    raggruppa, setRaggruppa, piuAnni,
    etichettaPeriodo, numeroMesi,
    transazioniPeriodo,
    totale, primarie, secondarie: totale - primarie,
    movimenti: righeFiltrate.length,
    mediaMensile: numeroMesi > 0 ? totale / numeroMesi : 0,
    mesiConSpesa: andamentoMensile.filter(p => p.totale > 0).length,
    andamento, mesePiuAlto, precedente,
    etichettaMese,
    perMacro, perCategoria, perTipo
  };
}

function raggruppaPer(txs: Transaction[], chiave: (t: Transaction) => string) {
  const m = new Map<string, number>();
  txs.forEach(t => m.set(chiave(t), (m.get(chiave(t)) || 0) + (Number(t.importo) || 0)));
  return Array.from(m, ([name, value]) => ({ name, value })).sort((x, y) => y.value - x.value);
}
