import { useMemo, useState } from 'react';
import type { Transaction } from '../data/mockData';
import { useFinanceData } from '../context/FinanceDataContext';
import { getMonthIndex, getTransactionYear } from '../utils/date';
import { FILTRI_USCITE_VUOTI, FiltriUscite, filtraUscite } from '../utils/filtriUscite';
import { chiaveMese, etichettaMese, meseCorrenteChiave, usePeriodoAnalisi } from './usePeriodoAnalisi';

/**
 * Calcoli della scheda "Analisi" di Uscite: le uscite su un periodo a scelta
 * (ultimi 12 mesi, un anno, tutto, o da/a), con gli stessi filtri della
 * tabella. Serve per domande tipo "quanto ho speso di rifornimenti nel 2025":
 * totale, media al mese, andamento mese per mese (o anno per anno), confronto
 * col periodo precedente della stessa lunghezza e ripartizione per categoria.
 * I mesi futuri (ricorrenti già scritte nel foglio) restano fuori.
 */


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
  const meseCorrente = meseCorrenteChiave();
  const [filtri, setFiltri] = useState<FiltriUscite>(FILTRI_USCITE_VUOTI);
  const [raggruppa, setRaggruppa] = useState<'mese' | 'anno'>('mese');

  // Uscite con il loro mese, senza i mesi futuri.
  const conChiave = useMemo(() => (data.uscite || [])
    .map(t => ({ t, k: chiaveTransazione(t) }))
    .filter((x): x is { t: Transaction; k: number } => x.k !== null && x.k <= meseCorrente),
  [data.uscite, meseCorrente]);

  const p = usePeriodoAnalisi(useMemo(() => conChiave.map(x => x.k), [conChiave]));
  const { inizio, fine, numeroMesi } = p;

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
    if (!p.precedenteCompleto) return null;
    const txs = conChiave.filter(x => x.k >= pInizio && x.k <= pFine).map(x => x.t);
    return { totale: somma(filtraUscite(txs, filtri)), inizio: pInizio, fine: pFine };
  }, [conChiave, inizio, numeroMesi, p.precedenteCompleto, filtri]);

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
    if (p.precedenteCompleto) {
      const txs = conChiave.filter(x => x.k >= inizio - numeroMesi && x.k < inizio).map(x => x.t);
      prima = dividi(filtraUscite(txs, filtri, ['tipo']));
    }
    return { attuale, prima };
  }, [transazioniPeriodo, conChiave, filtri, inizio, numeroMesi, p.precedenteCompleto]);

  // Le torte ignorano il proprio filtro (come in Uscite: la fetta scelta resta
  // evidenziata e le altre si vedono ancora).
  const perMacro = useMemo(() => raggruppaPer(filtraUscite(transazioniPeriodo, filtri, ['macro', 'categoria']), t => t.macroCategoria || 'Altro'), [transazioniPeriodo, filtri]);
  const perCategoria = useMemo(() => raggruppaPer(filtraUscite(transazioniPeriodo, filtri, ['categoria']), t => t.categoria || 'Altro'), [transazioniPeriodo, filtri]);


  return {
    ...p,
    filtri, setFiltri,
    raggruppa, setRaggruppa, piuAnni,
    transazioniPeriodo,
    totale, primarie, secondarie: totale - primarie,
    movimenti: righeFiltrate.length,
    mediaMensile: numeroMesi > 0 ? totale / numeroMesi : 0,
    mesiConSpesa: andamentoMensile.filter(p => p.totale > 0).length,
    andamento, mesePiuAlto, precedente,
    perMacro, perCategoria, perTipo
  };
}

function raggruppaPer(txs: Transaction[], chiave: (t: Transaction) => string) {
  const m = new Map<string, number>();
  txs.forEach(t => m.set(chiave(t), (m.get(chiave(t)) || 0) + (Number(t.importo) || 0)));
  return Array.from(m, ([name, value]) => ({ name, value })).sort((x, y) => y.value - x.value);
}
