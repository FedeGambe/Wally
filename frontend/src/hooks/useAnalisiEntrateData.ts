import { useMemo, useState } from 'react';
import type { EntrataRecord } from '../data/mockData';
import { useFinanceData } from '../context/FinanceDataContext';
import { getMonthIndex } from '../utils/date';
import { chiaveMese, etichettaMese, meseCorrenteChiave, usePeriodoAnalisi } from './usePeriodoAnalisi';

/**
 * Calcoli della scheda "Analisi periodo" di Entrate: i movimenti del foglio
 * Entrate su un periodo a scelta, filtrati per categoria, conto e testo.
 * Totale, media al mese, andamento mese per mese (o anno per anno), confronto
 * col periodo precedente della stessa lunghezza e ripartizione per categoria e
 * per conto. Stesso periodo e stessa struttura dell'analisi delle Uscite.
 * Conta solo i movimenti registrati (non il totale entrate del foglio
 * Risparmio), così cifre, torte e tabella guardano le stesse righe.
 */

export interface FiltriEntrate {
  testo: string;
  categoria: string;
  conto: string;
}
export const FILTRI_ENTRATE_VUOTI: FiltriEntrate = { testo: '', categoria: '', conto: '' };

const categoriaDi = (e: EntrataRecord) => e.categoria || 'Altro';
const contoDi = (e: EntrataRecord) => e.conto || 'Altro';

/** Applica i filtri; `ignora` esclude alcune voci (le torte ignorano il proprio). */
export function filtraEntrate(entrate: EntrataRecord[], f: FiltriEntrate, ignora: (keyof FiltriEntrate)[] = []) {
  const usa = (k: keyof FiltriEntrate) => !ignora.includes(k) && f[k] !== '';
  const testo = f.testo.toLowerCase();
  return entrate.filter(e => {
    if (usa('testo') && !`${e.descrizione || ''} ${e.categoria || ''} ${e.conto || ''} ${e.dettagli || ''}`.toLowerCase().includes(testo)) return false;
    if (usa('categoria') && categoriaDi(e) !== f.categoria) return false;
    if (usa('conto') && contoDi(e) !== f.conto) return false;
    return true;
  });
}

function chiaveEntrata(e: EntrataRecord): number | null {
  let anno = Number(e.anno);
  if (anno > 0 && anno < 100) anno += 2000;
  const mese = getMonthIndex(String(e.mese || '').trim());
  if (mese !== -1 && anno > 2000) return chiaveMese(anno, mese);
  const parti = String(e.data || '').split(/[\/\-]/);
  if (parti.length === 3) {
    const m = parseInt(parti[1], 10) - 1; // gg/mm/aaaa e aaaa-mm-gg: il mese è al centro
    const a = parti[0].length === 4 ? +parti[0] : +parti[2];
    if (m >= 0 && m < 12 && a > 2000) return chiaveMese(a, m);
  }
  return null;
}

const somma = (xs: EntrataRecord[]) => xs.reduce((s, e) => s + (Number(e.importo) || 0), 0);

function raggruppaPer(xs: EntrataRecord[], chiave: (e: EntrataRecord) => string) {
  const m = new Map<string, number>();
  xs.forEach(e => m.set(chiave(e), (m.get(chiave(e)) || 0) + (Number(e.importo) || 0)));
  return Array.from(m, ([name, value]) => ({ name, value })).sort((x, y) => y.value - x.value);
}

export interface PuntoEntrate {
  etichetta: string;
  totale: number;
  movimenti: number;
}

export function useAnalisiEntrateData() {
  const { data } = useFinanceData();
  const meseCorrente = meseCorrenteChiave();
  const [filtri, setFiltri] = useState<FiltriEntrate>(FILTRI_ENTRATE_VUOTI);
  const [raggruppa, setRaggruppa] = useState<'mese' | 'anno'>('mese');

  // Movimenti con il loro mese; fuori i mesi futuri e le righe senza importo.
  const conChiave = useMemo(() => (data.entrate || [])
    .map(e => ({ e, k: chiaveEntrata(e) }))
    .filter((x): x is { e: EntrataRecord; k: number } => x.k !== null && x.k <= meseCorrente && Number(x.e.importo) > 0),
  [data.entrate, meseCorrente]);

  const p = usePeriodoAnalisi(useMemo(() => conChiave.map(x => x.k), [conChiave]));
  const { inizio, fine, numeroMesi } = p;

  const nelPeriodo = useMemo(() => conChiave.filter(x => x.k >= inizio && x.k <= fine), [conChiave, inizio, fine]);
  const entratePeriodo = useMemo(() => nelPeriodo.map(x => x.e), [nelPeriodo]);
  const filtrate = useMemo(() => new Set(filtraEntrate(entratePeriodo, filtri)), [entratePeriodo, filtri]);
  const righeFiltrate = useMemo(() => nelPeriodo.filter(x => filtrate.has(x.e)), [nelPeriodo, filtrate]);

  const totale = useMemo(() => somma(righeFiltrate.map(x => x.e)), [righeFiltrate]);

  const andamentoMensile = useMemo(() => {
    const punti = new Map<number, PuntoEntrate & { chiave: number }>();
    for (let k = inizio; k <= fine; k++) punti.set(k, { chiave: k, etichetta: etichettaMese(k), totale: 0, movimenti: 0 });
    righeFiltrate.forEach(({ e, k }) => {
      const q = punti.get(k)!;
      q.totale += Number(e.importo) || 0;
      q.movimenti += 1;
    });
    return Array.from(punti.values());
  }, [righeFiltrate, inizio, fine]);

  const andamentoAnnuale = useMemo(() => {
    const perAnno = new Map<number, PuntoEntrate>();
    andamentoMensile.forEach(q => {
      const anno = Math.floor(q.chiave / 12);
      const r = perAnno.get(anno) ?? { etichetta: String(anno), totale: 0, movimenti: 0 };
      r.totale += q.totale; r.movimenti += q.movimenti;
      perAnno.set(anno, r);
    });
    return Array.from(perAnno.values());
  }, [andamentoMensile]);

  const piuAnni = andamentoAnnuale.length > 1;
  const andamento: PuntoEntrate[] = raggruppa === 'anno' && piuAnni ? andamentoAnnuale : andamentoMensile;

  const mesePiuAlto = useMemo(() => andamentoMensile.reduce<(typeof andamentoMensile)[number] | null>(
    (m, q) => (q.totale > 0 && (!m || q.totale > m.totale) ? q : m), null), [andamentoMensile]);

  // Stessi mesi subito prima, solo se i dati li coprono tutti.
  const precedente = useMemo(() => {
    if (!p.precedenteCompleto) return null;
    const xs = conChiave.filter(x => x.k >= inizio - numeroMesi && x.k < inizio).map(x => x.e);
    return { totale: somma(filtraEntrate(xs, filtri)) };
  }, [conChiave, inizio, numeroMesi, p.precedenteCompleto, filtri]);

  const perCategoria = useMemo(() => raggruppaPer(filtraEntrate(entratePeriodo, filtri, ['categoria']), categoriaDi), [entratePeriodo, filtri]);
  const perConto = useMemo(() => raggruppaPer(filtraEntrate(entratePeriodo, filtri, ['conto']), contoDi), [entratePeriodo, filtri]);

  // Tabella: dal mese più recente; a parità di mese, dalla data più recente.
  const righe = useMemo(() => [...righeFiltrate]
    .sort((x, y) => y.k - x.k || String(y.e.data || '').localeCompare(String(x.e.data || '')))
    .map(x => ({ ...x.e, etichettaMese: etichettaMese(x.k) })), [righeFiltrate]);

  return {
    ...p,
    filtri, setFiltri,
    raggruppa, setRaggruppa, piuAnni,
    entratePeriodo,
    totale,
    movimenti: righeFiltrate.length,
    mediaMensile: numeroMesi > 0 ? totale / numeroMesi : 0,
    mesiConEntrate: andamentoMensile.filter(q => q.totale > 0).length,
    andamento, mesePiuAlto, precedente,
    perCategoria, perConto, righe
  };
}
