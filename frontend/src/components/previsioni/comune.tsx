import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { formatEuro } from '../../utils/format';
import type { Stima } from '../../lib/previsioniService';

/**
 * Pezzi comuni della pagina Previsioni. Regola della pagina: una STIMA non si
 * presenta mai come una cifra esatta. Si arrotonda (euroStima), si mostra con
 * la sua fascia, ha l'etichetta "stima" e nei grafici è tratteggiata.
 * Le cifre vere (già speso, patrimonio di oggi, storico) restano esatte.
 */

const MESI_BREVI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
const MESI_LUNGHI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre',
  'ottobre', 'novembre', 'dicembre'];

/** "2026-10" → "ott 26" */
export const meseBreve = (chiave: string) => {
  const [anno, mese] = chiave.split('-').map(Number);
  return `${MESI_BREVI[mese - 1]} ${String(anno).slice(2)}`;
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

/** Asse dei grafici: 1.200 → "1,2k", 250.000 → "250k". */
export const euroAsse = (v: number) =>
  Math.abs(v) >= 1000 ? `${(v / 1000).toLocaleString('it-IT', { maximumFractionDigits: 1 })}k` : `${Math.round(v)}`;

export function Riquadro({ icona: Icona, titolo, sottotitolo, children, destra }: {
  icona: LucideIcon; titolo: string; sottotitolo?: React.ReactNode; children: React.ReactNode; destra?: React.ReactNode;
}) {
  return (
    <section className="bg-white p-6 rounded-3xl border border-hairline shadow-sm text-left">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5 border-b border-hairline pb-4">
        <div className="flex items-start gap-2">
          <Icona className="w-5 h-5 text-violet-500 mt-0.5 shrink-0" />
          <div>
            <h2 className="font-bold text-ink font-display text-base leading-snug">{titolo}</h2>
            {sottotitolo && <p className="text-xs text-ink-soft mt-0.5">{sottotitolo}</p>}
          </div>
        </div>
        {destra}
      </div>
      {children}
    </section>
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
      <div className={`font-display font-black text-ink mt-1 ${grande ? 'text-3xl' : 'text-xl'}`}>~ {euroStima(stima.centrale)}</div>
      <div className="text-xs text-ink-soft mt-0.5">tra {euroStima(stima.basso)} e {euroStima(stima.alto)}</div>
    </div>
  );
}

export function ValoreEsatto({ etichetta, valore, nota }: { etichetta: string; valore: React.ReactNode; nota?: React.ReactNode }) {
  return (
    <div>
      <div className="text-2xs font-bold uppercase tracking-wider text-ink-soft">{etichetta}</div>
      <div className="font-display font-black text-ink text-xl mt-1">{valore}</div>
      {nota && <div className="text-xs text-ink-soft mt-0.5">{nota}</div>}
    </div>
  );
}

export function NonDisponibile({ motivo }: { motivo: string }) {
  return <p className="text-sm text-ink-soft py-6 text-center">{motivo}</p>;
}

/** Riga "Come è calcolata" in fondo a ogni riquadro. */
export function Nota({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-ink-soft mt-4 leading-relaxed">{children}</p>;
}

/** Riquadro del tooltip dei grafici. */
export function Suggerimento({ titolo, righe }: { titolo: string; righe: { nome: string; valore: string; colore?: string }[] }) {
  return (
    <div className="dropdown-menu-panel rounded-xl border border-hairline bg-white dark:bg-slate-900 px-3 py-2 text-xs shadow-lg">
      <div className="font-bold mb-1 text-ink">{titolo}</div>
      {righe.map(r => (
        <div key={r.nome} className="flex items-center gap-1.5 mt-0.5 text-ink">
          {r.colore && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: r.colore }} />}
          <span className="text-ink-soft">{r.nome}:</span> <span className="font-semibold">{r.valore}</span>
        </div>
      ))}
    </div>
  );
}

export const COLORI = {
  stima: '#8b5cf6',
  fascia: '#8b5cf6',
  vero: '#2563eb',
  entrate: '#059669',
  spese: '#ea580c',
  risparmio: '#d946ef',
  versamenti: '#0ea5e9',
  mercato: '#089B3C',
  fondoPensione: '#d97706',
  griglia: '#94a3b8',
};
