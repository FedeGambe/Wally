import { useMemo, useState } from 'react';
import { useFinanceData } from '../context/FinanceDataContext';
import { leggiRifornimenti, Rifornimento } from './useAnalisiConsumiData';
import { chiaveMese, etichettaMese, meseCorrenteChiave, usePeriodoAnalisi } from './usePeriodoAnalisi';

/**
 * Calcoli della scheda "Analisi periodo" di Analisi Consumi: quanto costa l'auto
 * (carburante) su un periodo a scelta. Lavora sui singoli rifornimenti del foglio,
 * non sulle settimane: ogni rifornimento conta nel mese della sua data.
 *
 * Oltre a totali e andamento mese per mese (o anno per anno), confronta il periodo
 * con i mesi subito prima (quanti sono lunghi, o meno se i dati iniziano dopo) usando
 * le medie al mese, così due periodi di lunghezza diversa restano confrontabili, e
 * scompone la differenza di spesa mensile in tre parti
 * che sommate la danno esatta (spesa = km × prezzo al litro ÷ km/litro):
 *  - km: quanto è cambiata la spesa perché hai guidato di più o di meno;
 *  - prezzo: quanto perché il carburante costava di più o di meno;
 *  - consumo: quanto perché l'auto ha fatto più o meno km con un litro (la guida).
 */

export interface TotaliConsumi {
  spesa: number;
  litri: number;
  km: number;
  rifornimenti: number;
  /** Prezzo medio al litro pesato sui litri. */
  prezzo: number;
  /** km / litri del periodo. */
  kmAlLitro: number;
  /** spesa / km × 100. */
  euroPer100Km: number;
}

export function totali(xs: Rifornimento[]): TotaliConsumi {
  const spesa = xs.reduce((s, r) => s + r.costo, 0);
  const litri = xs.reduce((s, r) => s + r.quantitaLitri, 0);
  const km = xs.reduce((s, r) => s + r.kmEffettuati, 0);
  return {
    spesa, litri, km,
    rifornimenti: xs.length,
    prezzo: litri > 0 ? spesa / litri : 0,
    kmAlLitro: litri > 0 ? km / litri : 0,
    euroPer100Km: km > 0 ? spesa / km * 100 : 0
  };
}

/** Spesa, litri e km divisi per i mesi; i rapporti (prezzo, km/litro, €/100 km) non cambiano. */
export function alMese(t: TotaliConsumi, mesi: number): TotaliConsumi {
  const m = Math.max(1, mesi);
  return { ...t, spesa: t.spesa / m, litri: t.litri / m, km: t.km / m };
}

export interface Scomposizione {
  differenza: number;
  km: number;
  prezzo: number;
  consumo: number;
}

/**
 * Divide la differenza di spesa tra due periodi in effetto km, prezzo e consumo, uno
 * alla volta (prima i km, poi il prezzo, poi il consumo), così la somma è esatta.
 * null se un periodo non ha km o litri (i rapporti non esistono).
 */
export function scomponi(prima: TotaliConsumi, dopo: TotaliConsumi): Scomposizione | null {
  if (prima.km <= 0 || prima.litri <= 0 || dopo.km <= 0 || dopo.litri <= 0) return null;
  const effettoKm = (dopo.km - prima.km) * prima.prezzo / prima.kmAlLitro;
  const effettoPrezzo = dopo.km * (dopo.prezzo - prima.prezzo) / prima.kmAlLitro;
  const effettoConsumo = dopo.km * dopo.prezzo * (1 / dopo.kmAlLitro - 1 / prima.kmAlLitro);
  return { differenza: dopo.spesa - prima.spesa, km: effettoKm, prezzo: effettoPrezzo, consumo: effettoConsumo };
}

export interface PuntoConsumi {
  etichetta: string;
  spesa: number;
  km: number;
  litri: number;
  /** €/100 km del mese (null se non ci sono km). */
  euroPer100Km: number | null;
}

const chiaveDi = (r: Rifornimento) => chiaveMese(r.date.getFullYear(), r.date.getMonth());

export function useAnalisiConsumiPeriodo() {
  const { data } = useFinanceData();
  const meseCorrente = meseCorrenteChiave();
  const [raggruppa, setRaggruppa] = useState<'mese' | 'anno'>('mese');

  // Rifornimenti con il loro mese; fuori i mesi futuri.
  const conChiave = useMemo(() => leggiRifornimenti(data.analisiConsumi || [])
    .map(r => ({ r, k: chiaveDi(r) }))
    .filter(x => x.k <= meseCorrente),
  [data.analisiConsumi, meseCorrente]);

  const p = usePeriodoAnalisi(useMemo(() => conChiave.map(x => x.k), [conChiave]));
  const { inizio, fine, numeroMesi } = p;

  const nelPeriodo = useMemo(() => conChiave.filter(x => x.k >= inizio && x.k <= fine), [conChiave, inizio, fine]);
  const t = useMemo(() => totali(nelPeriodo.map(x => x.r)), [nelPeriodo]);

  const andamentoMensile = useMemo(() => {
    const punti = new Map<number, { chiave: number; etichetta: string; righe: Rifornimento[] }>();
    for (let k = inizio; k <= fine; k++) punti.set(k, { chiave: k, etichetta: etichettaMese(k), righe: [] });
    nelPeriodo.forEach(({ r, k }) => punti.get(k)!.righe.push(r));
    return Array.from(punti.values()).map(q => ({ chiave: q.chiave, etichetta: q.etichetta, righe: q.righe }));
  }, [nelPeriodo, inizio, fine]);

  const punto = (etichetta: string, righe: Rifornimento[]): PuntoConsumi => {
    const x = totali(righe);
    return { etichetta, spesa: x.spesa, km: x.km, litri: x.litri, euroPer100Km: x.km > 0 ? x.euroPer100Km : null };
  };

  const andamentoAnnuale = useMemo(() => {
    const perAnno = new Map<number, Rifornimento[]>();
    andamentoMensile.forEach(q => {
      const anno = Math.floor(q.chiave / 12);
      perAnno.set(anno, [...(perAnno.get(anno) ?? []), ...q.righe]);
    });
    return Array.from(perAnno, ([anno, righe]) => punto(String(anno), righe));
  }, [andamentoMensile]);

  const piuAnni = andamentoAnnuale.length > 1;
  const andamento: PuntoConsumi[] = raggruppa === 'anno' && piuAnni
    ? andamentoAnnuale
    : andamentoMensile.map(q => punto(q.etichetta, q.righe));

  // I mesi subito prima, lunghi quanto il periodo o meno se i dati iniziano dopo.
  // Confronti e scomposizione usano le medie al mese di entrambi i periodi.
  const precedente = useMemo(() => {
    const inizioPrec = Math.max(p.primoMese, inizio - numeroMesi);
    const mesi = inizio - inizioPrec;
    if (mesi < 1) return null;
    const x = totali(conChiave.filter(y => y.k >= inizioPrec && y.k < inizio).map(y => y.r));
    if (x.rifornimenti === 0) return null;
    return { mesi, etichetta: inizioPrec === inizio - 1 ? etichettaMese(inizioPrec) : `${etichettaMese(inizioPrec)} – ${etichettaMese(inizio - 1)}`, alMese: alMese(x, mesi) };
  }, [conChiave, inizio, numeroMesi, p.primoMese]);

  const tAlMese = useMemo(() => alMese(t, numeroMesi), [t, numeroMesi]);
  const scomposizione = useMemo(() => (precedente ? scomponi(precedente.alMese, tAlMese) : null), [precedente, tAlMese]);

  // Elenco: dal rifornimento più recente.
  const righe = useMemo(() => [...nelPeriodo]
    .sort((x, y) => y.r.date.getTime() - x.r.date.getTime())
    .map(x => x.r), [nelPeriodo]);

  return {
    ...p,
    raggruppa, setRaggruppa, piuAnni,
    totali: t,
    alMese: tAlMese,
    andamento, precedente, scomposizione, righe
  };
}
