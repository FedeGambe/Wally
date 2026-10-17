import React from 'react';
import { ChevronRight } from 'lucide-react';
import EuroAmount from '../EuroAmount';
import { formatEuro } from '../../utils/format';
import { getMonthIndex } from '../../utils/date';
import type { RisparmioMese } from '../../data/mockData';

interface PanoramicaRendicontoWidgetProps {
  currentMonthData: RisparmioMese;
  sogliaRisparmio: number;
  /** Spendibile del mese meno le spese secondarie già fatte (usePanoramicaData). */
  spendibileResiduo?: number;
  onOpenDetail: () => void;
}

/**
 * Card "Questo mese", la prima della Home su telefono e su computer: l'ancora
 * spendibile come cifra principale, sotto le voci del mese dal foglio Risparmio
 * e la soglia di risparmio. Al tocco/clic apre il dettaglio del mese.
 */
export default function PanoramicaRendicontoWidget({ currentMonthData, sogliaRisparmio, spendibileResiduo, onOpenDetail }: PanoramicaRendicontoWidgetProps) {
  const oggi = new Date();
  const eMeseInCorso = getMonthIndex(currentMonthData.mese) === oggi.getMonth() && currentMonthData.anno === oggi.getFullYear();
  const titolo = eMeseInCorso ? 'Questo mese' : `${currentMonthData.mese} ${currentMonthData.anno}`;
  // La colonna Spendibile arriva come 0 quando nel foglio è vuota: in quel caso
  // il residuo non ha senso e si mostra "—" invece di una cifra inventata.
  const spendibileMancante = !currentMonthData.spendibile || spendibileResiduo === undefined;
  const sforato = !spendibileMancante && spendibileResiduo! < 0;

  return (
    <button
      type="button"
      onClick={onOpenDetail}
      className="w-full h-full bg-slate-900 border border-slate-800 text-white p-5 lg:p-6 rounded-3xl shadow-sm text-left flex flex-col cursor-pointer transition-transform duration-200 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
    >
      <span className="flex items-center justify-between gap-3">
        <span className="text-base font-bold font-display text-white capitalize">{titolo}</span>
        <span className="flex items-center gap-0.5 text-2xs font-semibold text-slate-400">
          Dettaglio
          <ChevronRight className="w-3.5 h-3.5" />
        </span>
      </span>

      <span className="block mt-4">
        <span className="block text-2xs font-bold uppercase tracking-wider text-slate-400">
          {sforato ? 'Oltre lo spendibile di' : 'Ancora spendibile'}
        </span>
        <span className={`block mt-1.5 text-4xl font-black font-display leading-none tabular-nums ${sforato ? 'text-rose-400' : 'text-white'}`}>
          {spendibileMancante ? '—' : <EuroAmount value={Math.abs(spendibileResiduo!)} />}
        </span>
        <span className="block mt-2 text-xs text-slate-400">
          {spendibileMancante
            ? 'Spendibile del mese non impostato nel foglio Risparmio.'
            : `su ${formatEuro(currentMonthData.spendibile)} del mese, tolte le spese secondarie`}
        </span>
      </span>

      <span className="block my-5 space-y-3 border-t border-b border-slate-800 py-4">
        <span className="flex items-center justify-between text-xs">
          <span className="text-slate-400 font-medium">Entrate registrate:</span>
          <span className="font-bold font-display text-white">{formatEuro(currentMonthData.entrate)}</span>
        </span>
        <span className="flex items-center justify-between text-xs">
          <span className="text-slate-400 font-medium">Spese Primarie:</span>
          <span className="font-bold font-display text-slate-300">{formatEuro(currentMonthData.spesePrimarie)}</span>
        </span>
        <span className="flex items-center justify-between text-xs">
          <span className="text-slate-400 font-medium">Spese Secondarie:</span>
          <span className="font-bold font-display text-slate-300">{formatEuro(currentMonthData.speseSecondarie)}</span>
        </span>
        <span className="flex items-center justify-between text-xs">
          <span className="text-slate-400 font-medium">Spese totali:</span>
          <span className="font-bold font-display text-slate-300">{formatEuro(currentMonthData.speseTotali)}</span>
        </span>
        <span className="flex items-center justify-between text-xs">
          <span className="text-slate-400 font-medium">Capitale Investito:</span>
          <span className="font-bold font-display text-accent">{formatEuro(currentMonthData.investito)}</span>
        </span>
        <span className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs">
          <span className="text-slate-200 font-bold">Risparmio Netto:</span>
          <span className="text-base font-black font-display text-emerald-400"><EuroAmount value={currentMonthData.risparmioNetto} /></span>
        </span>
      </span>

      <span className="mt-auto flex items-center justify-between text-xs text-slate-300 bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
        <span className="flex items-center gap-1.5 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Soglia Target ({sogliaRisparmio}%)
        </span>
        <span className="font-extrabold text-emerald-400">{formatEuro(currentMonthData.entrate * (sogliaRisparmio / 100))}</span>
      </span>
    </button>
  );
}
