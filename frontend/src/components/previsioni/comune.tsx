import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { ChevronDown } from 'lucide-react';
import { formatEuro } from '../../utils/format';
import type { Stima } from '../../lib/previsioniService';
import EuroAmount from '../EuroAmount';

/**
 * Pezzi comuni della pagina Previsioni. Regola della pagina: una STIMA non si
 * presenta mai come una cifra esatta. Si arrotonda (euroStima), si mostra con
 * la sua fascia, ha l'etichetta "stima" e nei grafici è tratteggiata, nel
 * viola della pagina. Le cifre vere (già speso, patrimonio di oggi, storico)
 * restano esatte, coi centesimi (EuroAmount), e nei grafici hanno il colore
 * del loro dato come nel resto dell'app (spese arancio, entrate verde,
 * risparmio fucsia, investimenti azzurro).
 *
 * I grafici seguono lo stile delle altre pagine: curve morbide (monotone),
 * area con sfumatura sotto la serie vera, pallini bianchi bordati, griglia a
 * trattini senza righe verticali, assi senza linee con l'euro, tooltip scuro.
 */

const MESI_BREVI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
const MESI_LUNGHI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre',
  'ottobre', 'novembre', 'dicembre'];

/** "2026-10" → "ott 26" */
export const meseBreve = (chiave: string) => {
  const [anno, mese] = chiave.split('-').map(Number);
  return `${MESI_BREVI[mese - 1]} ${String(anno).slice(2)}`;
};

/** "2026-10" → "ott '26" (asse dei grafici, come in Entrate e Panoramica) */
export const meseAsse = (chiave: string) => {
  const [anno, mese] = chiave.split('-').map(Number);
  return `${MESI_BREVI[mese - 1].charAt(0).toUpperCase()}${MESI_BREVI[mese - 1].slice(1)} '${String(anno).slice(2)}`;
};

/** "2026-10" → "ottobre 2026" */
export const meseLungo = (chiave: string) => {
  const [anno, mese] = chiave.split('-').map(Number);
  return `${MESI_LUNGHI[mese - 1]} ${anno}`;
};

/** Una stima arrotondata a una precisione che non finge di sapere i centesimi. */
export function euroStima(valore: number): string {
  const assoluto = Math.abs(valore);
  const passo = assoluto >= 100_000 ? 1000 : assoluto >= 10_000 ? 100 : 10;
  const arrotondato = Math.round(valore / passo) * passo;
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0, useGrouping: true }).format(arrotondato);
}

export const euroEsatto = formatEuro;

export const percentuale = (v: number | null | undefined, decimali = 0) =>
  v === null || v === undefined ? '—' : `${(v * 100).toLocaleString('it-IT', { maximumFractionDigits: decimali, minimumFractionDigits: decimali })}%`;

/** Asse dei grafici: 1.200 → "1,2k €", 250.000 → "250k €", 800 → "800 €" (come Patrimonio). */
export const euroAsse = (v: number) =>
  Math.abs(v) >= 1000 ? `${(v / 1000).toLocaleString('it-IT', { maximumFractionDigits: 1 })}k €` : `${Math.round(v)} €`;

/** Colori della pagina: viola per le stime (il colore di Previsioni), i colori dei dati per le cifre vere. */
export const COLORI = {
  stima: '#8b5cf6',
  fascia: '#8b5cf6',
  entrate: '#10b981',
  spese: '#ea580c',
  risparmio: '#d946ef',
  versamenti: '#0ea5e9',
  mercato: '#089B3C',
  fondoPensione: '#d97706',
  neutro: '#94a3b8',
};

/** Props comuni di griglia e assi, gli stessi di Entrate/Uscite/Panoramica. */
export const GRIGLIA = { strokeDasharray: '3 3', vertical: false, stroke: '#f1f5f9' } as const;
export const ASSE = { stroke: '#94a3b8', fontSize: 11, tickLine: false, axisLine: false } as const;
/** Pallino dei punti mensili veri: bianco con il bordo del colore della serie. */
export const pallino = (colore: string) => ({ r: 3, fill: '#fff', stroke: colore, strokeWidth: 1.5 });

/**
 * Card della pagina, come i widget delle altre pagine: icona nel colore della
 * pagina accanto al titolo, sottotitolo piccolo, a destra i controlli.
 */
export function Riquadro({ icona: Icona, titolo, sottotitolo, children, destra }: {
  icona: LucideIcon; titolo: string; sottotitolo?: React.ReactNode; children: React.ReactNode; destra?: React.ReactNode;
}) {
  return (
    <section className="bg-white p-6 rounded-3xl border border-hairline shadow-sm text-left transition-all duration-300 hover:shadow-md">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h2 className="font-bold text-ink font-display text-base flex items-center gap-2">
            <Icona className="w-5 h-5 text-violet-600 dark:text-violet-400 shrink-0" />
            {titolo}
          </h2>
          {sottotitolo && <p className="text-xs text-ink-soft mt-1">{sottotitolo}</p>}
        </div>
        {destra}
      </div>
      {children}
    </section>
  );
}

/** Scelta a segmenti (es. Totali/Primarie/Secondarie), come Mensile/Cumulato della Home. */
export function Segmenti<T extends string>({ voci, attiva, onChange, etichetta }: {
  voci: Record<T, string>; attiva: T; onChange: (v: T) => void; etichetta: string;
}) {
  return (
    <div role="group" aria-label={etichetta} className="flex bg-canvas p-1 rounded-xl gap-0.5 border border-hairline select-none">
      {(Object.keys(voci) as T[]).map(v => (
        <button key={v} type="button" onClick={() => onChange(v)} aria-pressed={attiva === v}
          className={`text-3xs px-3 py-1.5 font-extrabold rounded-lg transition-all cursor-pointer ${attiva === v
            ? 'bg-violet-600 text-white shadow-sm'
            : 'text-ink-soft hover:text-violet-600 dark:hover:text-violet-300'}`}>
          {voci[v]}
        </button>
      ))}
    </div>
  );
}

export function EtichettaStima() {
  return (
    <span className="ml-1.5 align-middle text-3xs font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-400/10 dark:text-violet-300 dark:border-violet-400/30">
      stima
    </span>
  );
}

/** Valore con fascia: "~ 1.450 €" grande, "tra 1.300 € e 1.600 €" sotto. */
export function ValoreStimato({ etichetta, stima, grande = false }: { etichetta: string; stima: Stima; grande?: boolean }) {
  return (
    <div>
      <div className="text-2xs font-bold uppercase tracking-wider text-ink-soft">{etichetta}<EtichettaStima /></div>
      <div className={`font-display font-black text-ink leading-none mt-2 ${grande ? 'text-3xl' : 'text-2xl'}`}>~ {euroStima(stima.centrale)}</div>
      <div className="text-xs text-ink-soft mt-1.5">tra {euroStima(stima.basso)} e {euroStima(stima.alto)}</div>
    </div>
  );
}

/** Cifra vera: con un numero usa EuroAmount (centesimi più piccoli, mai tolti). */
export function ValoreEsatto({ etichetta, valore, nota }: { etichetta: string; valore: number | React.ReactNode; nota?: React.ReactNode }) {
  return (
    <div>
      <div className="text-2xs font-bold uppercase tracking-wider text-ink-soft">{etichetta}</div>
      <div className="font-display font-black text-ink text-2xl leading-none mt-2">
        {typeof valore === 'number' ? <EuroAmount value={valore} /> : valore}
      </div>
      {nota && <div className="text-xs text-ink-soft mt-1.5">{nota}</div>}
    </div>
  );
}

export function NonDisponibile({ motivo }: { motivo: string }) {
  return <p className="text-sm text-ink-soft py-6 text-center">{motivo}</p>;
}

/** "Come è calcolata" in fondo a ogni riquadro: chiusa, si apre al clic. */
export function Nota({ children }: { children: React.ReactNode }) {
  return (
    <details className="group mt-6 pt-4 border-t border-hairline">
      <summary className="flex items-center gap-1.5 text-xs font-semibold text-ink-soft hover:text-ink cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden">
        <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180" />
        Come è calcolata
      </summary>
      <p className="text-xs text-ink-soft mt-2 leading-relaxed">{children}</p>
    </details>
  );
}

/** Tooltip dei grafici: riquadro scuro come nella Home, nome nel colore della serie e cifra in bianco. */
export function Suggerimento({ titolo, righe }: { titolo: string; righe: { nome: string; valore: string; colore?: string }[] }) {
  return (
    <div style={{ background: '#1e293b', borderRadius: 16, color: '#fff', fontSize: 12, padding: '10px 14px' }} className="shadow-lg">
      <div className="font-bold capitalize" style={{ marginBottom: 6 }}>{titolo}</div>
      {righe.map((r, i) => (
        <div key={r.nome} className="flex items-center justify-between gap-4" style={{ marginTop: i > 0 ? 4 : 0 }}>
          <span className="font-bold" style={{ color: r.colore ?? '#cbd5e1' }}>{r.nome}</span>
          <span className="text-white font-mono">{r.valore}</span>
        </div>
      ))}
    </div>
  );
}

export type VoceLegenda = { nome: string; colore: string; forma?: 'punto' | 'tratteggio' | 'puntini' | 'fascia'; opacita?: number };

/** Legenda sopra i grafici, come in Uscite: pallino (o trattino) colorato e nome. */
export function Legenda({ voci, className = '' }: { voci: VoceLegenda[]; className?: string }) {
  return (
    <div className={`flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 ${className}`}>
      {voci.map(v => (
        <span key={v.nome} className="flex items-center gap-1.5 text-ink-soft" style={{ fontSize: 11, fontWeight: 600 }}>
          {v.forma === 'tratteggio' || v.forma === 'puntini' ? (
            <span className={`w-4 border-t-2 ${v.forma === 'tratteggio' ? 'border-dashed' : 'border-dotted'}`} style={{ borderColor: v.colore }} />
          ) : v.forma === 'fascia' ? (
            <span className="w-3.5 h-2.5 rounded-sm" style={{ background: v.colore, opacity: v.opacita ?? 0.3 }} />
          ) : (
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: v.colore }} />
          )}
          {v.nome}
        </span>
      ))}
    </div>
  );
}
