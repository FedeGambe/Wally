import React from 'react';
import EuroAmount from '../EuroAmount';
import { formatEuro } from '../../utils/format';
import type { RisparmioMese } from '../../data/mockData';

interface PanoramicaRendicontoWidgetProps {
  currentMonthData: RisparmioMese;
  sogliaRisparmio: number;
  /** Su mobile l'intero widget è cliccabile e apre il drawer di dettaglio mensile. */
  isMobile: boolean;
  onOpenDetail: () => void;
}

/**
 * Widget "Rendiconto Mese Corrente" / "Disponibilità Netta": renderizzato due
 * volte da Panoramica (una sola volta visibile a seconda del breakpoint), per
 * spostarlo subito dopo i 4 widget patrimonio su mobile — dove sostituisce
 * anche il box "Mese Corrente" (nascosto lì, il suo contenuto è già tutto qui
 * + nel popup di dettaglio).
 */
export default function PanoramicaRendicontoWidget({ currentMonthData, sogliaRisparmio, isMobile, onOpenDetail }: PanoramicaRendicontoWidgetProps) {
  return (
    <div
      onClick={isMobile ? onOpenDetail : undefined}
      className={`bg-slate-900 border border-slate-800 text-white p-6 rounded-3xl shadow-sm text-left flex flex-col justify-between transition-all duration-300 hover:shadow-md ${isMobile ? 'cursor-pointer active:scale-[0.99]' : ''}`}
    >
      <div>
        <span className="text-[10px] text-accent font-bold uppercase tracking-wider">Rendiconto Mese Corrente</span>
        <h3 className="text-2.5xl font-black font-display mt-2 text-white leading-none">Disponibilità Netta</h3>
        <p className="text-xs text-slate-300 mt-3 leading-relaxed">
          <span className="hidden md:inline">Sintesi dei flussi di questo mese ricavati direttamente dal foglio Risparmio.</span>
          <span className="md:hidden">Tocca per il dettaglio completo del mese.</span>
        </p>
      </div>

      <div className="my-5 space-y-3 px-1 border-t border-b border-slate-800 py-5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-ink-soft font-medium">Entrate registrate:</span>
          <span className="font-bold font-display text-white">{formatEuro(currentMonthData.entrate)}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-ink-soft font-medium">Spese Primarie:</span>
          <span className="font-bold font-display text-slate-300">{formatEuro(currentMonthData.spesePrimarie)}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-ink-soft font-medium">Spese Secondarie:</span>
          <span className="font-bold font-display text-slate-300">{formatEuro(currentMonthData.speseSecondarie)}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-ink-soft font-medium">Uscite totali:</span>
          <span className="font-bold font-display text-slate-300">{formatEuro(currentMonthData.speseTotali)}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-ink-soft font-medium">Capitale Investito:</span>
          <span className="font-bold font-display text-accent">{formatEuro(currentMonthData.investito)}</span>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs">
          <span className="text-slate-200 font-bold">Risparmio Netto:</span>
          <span className="text-base font-black font-display text-emerald-400"><EuroAmount value={currentMonthData.risparmioNetto} /></span>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-300 bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
        <span className="flex items-center gap-1.5 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Soglia Target ({sogliaRisparmio}%)
        </span>
        <span className="font-extrabold text-emerald-400">{formatEuro(currentMonthData.entrate * (sogliaRisparmio / 100))}</span>
      </div>
    </div>
  );
}
