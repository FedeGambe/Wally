import React from 'react';
import { ArrowDownLeft, CheckCircle, XCircle } from 'lucide-react';
import EuroAmount from '../EuroAmount';
import { formatPercent } from '../../utils/format';

// Estratto da Uscite.tsx: le tre card KPI (Totali/Primarie/Secondarie) con
// barra di progresso rispetto alla soglia dinamica e badge di variazione
// rispetto al mese precedente. Design specifico di questa pagina (non
// riutilizza FinanceKpiCard, che non ha barra soglia né badge delta).

const renderDeltaBadge = (current: number, previous: number | undefined, isDark: boolean) => {
  if (previous === undefined || previous === 0) return null;
  const isPreviousHigher = previous > current; // spending decreased -> Green (good)
  const percentDiff = Math.abs(((current - previous) / previous) * 100);
  const formattedPct = formatPercent(percentDiff);

  const colorClass = isDark
    ? (isPreviousHigher ? 'text-emerald-300 bg-emerald-500/20' : 'text-rose-300 bg-rose-500/20')
    : (isPreviousHigher ? 'text-up bg-emerald-50' : 'text-down bg-rose-50');

  return (
    <span className={`inline-flex items-center text-3xs font-extrabold ${colorClass} px-1.5 py-0.5 rounded-md shrink-0 align-middle`}>
      {isPreviousHigher ? '↓' : '↑'} {formattedPct}
    </span>
  );
};

interface UsciteKpiCardsProps {
  selectedRecord: { mese: string; anno: number; speseTotali: number; spesePrimarie: number; speseSecondarie: number };
  prevRecord?: { speseTotali?: number; spesePrimarie?: number; speseSecondarie?: number };
  activeChartFilter: string;
  setActiveChartFilter: (filter: 'all' | 'primarie' | 'secondarie') => void;
  totalPctOfIncome: number;
  primaryPctOfIncome: number;
  secondaryPctOfIncome: number;
  dynamicThresholds: { totali: number; primarie: number; secondarie: number };
}

export default function UsciteKpiCards({
  selectedRecord,
  prevRecord,
  activeChartFilter,
  setActiveChartFilter,
  totalPctOfIncome,
  primaryPctOfIncome,
  secondaryPctOfIncome,
  dynamicThresholds
}: UsciteKpiCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6">
      {/* Cumulative Monthly Expenses - Orange card */}
      <button
        type="button"
        onClick={() => setActiveChartFilter('all')}
        aria-pressed={activeChartFilter === 'all'}
        className={`w-full text-left cursor-pointer text-white rounded-3xl p-6 flex flex-col justify-between shadow-lg relative overflow-hidden md:min-h-[15.5rem] border transition-all duration-300 hover:shadow-xl hover:scale-[1.01] ${
          activeChartFilter === 'all'
            ? 'bg-orange-600 border-orange-400 ring-4 ring-orange-500/20'
            : 'bg-orange-700/80 border-orange-800 opacity-80 hover:opacity-100'
        }`}
      >
        <div className="absolute right-4 top-4 w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-orange-100 backdrop-blur-xs">
          <ArrowDownLeft className="w-6 h-6" />
        </div>
        <div className="z-10 text-left">
          <span className="text-xs text-orange-100 font-bold uppercase tracking-wider block">
            Spese Totali
          </span>
          <span className="text-3xs text-orange-200 font-normal block mt-0.5 lowercase">
            ({selectedRecord.mese} {selectedRecord.anno})
          </span>
          <div className="mt-3 text-left">
            <div className="flex items-center gap-2.5">
              <h3 className="text-3xl font-extrabold font-display text-white leading-none">
                <EuroAmount value={selectedRecord.speseTotali} />
              </h3>
              {prevRecord?.speseTotali && (
                <div className="flex flex-col items-start leading-none mt-1">
                  {renderDeltaBadge(selectedRecord.speseTotali, prevRecord?.speseTotali, true)}
                  <span className="text-3xs text-orange-200 mt-1 whitespace-nowrap">rispetto al mese prec.</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Progress bar compared to Entrate.
            La barra non è scalata sul 100%, ma su "soglia + 5 punti": così la
            tacca verticale (il marcatore della soglia) non finisce sempre
            appiccicata al bordo destro e si vede meglio quanto si è vicini
            o lontani dal limite. Stesso pattern ripetuto per Primarie e
            Secondarie qui sotto. */}
        <div className="mt-4 pt-3 border-t border-white/15 w-full z-10">
          <div className="flex justify-between items-center text-3xs text-orange-100 font-bold mb-1">
            <span>Rapporto Entrate</span>
            <span className={totalPctOfIncome > dynamicThresholds.totali ? 'text-red-300 font-bold' : 'text-orange-100 font-bold'}>
              {formatPercent(totalPctOfIncome)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden relative">
              <div
                className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-orange-200 to-amber-200"
                style={{ width: `${Math.min((totalPctOfIncome / (dynamicThresholds.totali + 5)) * 100, 100)}%` }}
              />
              <div className="absolute top-0 bottom-0 w-0.5 bg-white/40" style={{ left: `${(dynamicThresholds.totali / (dynamicThresholds.totali + 5)) * 100}%` }} />
            </div>
          </div>
          <div className="flex justify-between items-center text-3xs text-orange-200 mt-1">
            <span>Soglia: {dynamicThresholds.totali}% delle entrate</span>
            <span className={totalPctOfIncome > dynamicThresholds.totali ? 'text-red-300 font-semibold' : 'text-orange-100 font-semibold'}>
              {totalPctOfIncome > dynamicThresholds.totali ? 'Soglia superata' : 'Nei limiti'}
            </span>
          </div>
        </div>

        <div className="absolute -right-4 -bottom-4 opacity-10">
          <ArrowDownLeft className="w-32 h-32" />
        </div>
      </button>

      {/* Spese Primarie + Secondarie: side by side on mobile, own grid columns on desktop */}
      <div className="grid grid-cols-2 gap-3 md:contents">
        {/* Spese primarie - White Card */}
        <button
          type="button"
          onClick={() => setActiveChartFilter('primarie')}
          aria-pressed={activeChartFilter === 'primarie'}
          className={`w-full cursor-pointer p-4 sm:p-6 rounded-3xl border text-left relative overflow-hidden flex flex-col justify-between min-h-[11rem] md:min-h-[15.5rem] transition-all duration-300 hover:shadow-md hover:scale-[1.01] ${
            activeChartFilter === 'primarie'
              ? 'bg-orange-50 border-orange-700 ring-4 ring-orange-700/15'
              : 'bg-white border-hairline hover:border-hairline'
          }`}
        >
          <div className={`absolute right-4 top-4 w-12 h-12 rounded-xl flex items-center justify-center transition-colors border ${
            activeChartFilter === 'primarie'
              ? 'bg-orange-700 border-orange-700 text-white'
              : 'bg-orange-50 border-orange-100 text-orange-700'
          }`}>
            <CheckCircle className="w-6 h-6" />
          </div>
          <div className="z-10 text-left pr-14 md:pr-0">
            <span className="text-xs text-ink-soft font-bold uppercase tracking-wider block">
              <span className="md:hidden">Spese Prim.</span>
              <span className="hidden md:inline">Spese Primarie</span>
            </span>
            <span className="hidden md:block text-3xs text-ink-soft font-normal mt-0.5 lowercase">
              (essenziali)
            </span>
            <div className="mt-3 text-left">
              <div className="flex items-center flex-wrap gap-2.5">
                <h3 className="text-3xl font-extrabold font-display leading-none text-ink">
                  <EuroAmount value={selectedRecord.spesePrimarie} />
                </h3>
                {prevRecord?.spesePrimarie && (
                  <div className="flex flex-col items-start leading-none mt-1">
                    {renderDeltaBadge(selectedRecord.spesePrimarie, prevRecord?.spesePrimarie, false)}
                    <span className="text-3xs text-ink-soft mt-1">rispetto al mese prec.</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Progress bar compared to Entrate */}
          <div className="mt-4 pt-3 border-t border-hairline w-full z-10">
            <div className="hidden md:flex justify-between items-center text-3xs text-ink-soft font-bold mb-1">
              <span>Rapporto Entrate</span>
              <span className={primaryPctOfIncome > dynamicThresholds.primarie ? 'text-down font-bold' : 'text-up font-bold'}>
                {formatPercent(primaryPctOfIncome)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-canvas rounded-full overflow-hidden relative">
                <div
                  className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-orange-500 to-orange-700"
                  style={{ width: `${Math.min((primaryPctOfIncome / (dynamicThresholds.primarie + 5)) * 100, 100)}%` }}
                />
                <div className="absolute top-0 bottom-0 w-0.5 bg-slate-300" style={{ left: `${(dynamicThresholds.primarie / (dynamicThresholds.primarie + 5)) * 100}%` }} />
              </div>
            </div>
            <div className="flex justify-between items-center text-3xs text-ink-soft mt-1">
              <span>Soglia: {dynamicThresholds.primarie}% delle entrate</span>
              <span className={`hidden md:inline ${primaryPctOfIncome > dynamicThresholds.primarie ? 'text-down font-semibold' : 'text-up font-semibold'}`}>
                {primaryPctOfIncome > dynamicThresholds.primarie ? 'Soglia superata' : 'Nei limiti'}
              </span>
              <span className={`md:hidden ${primaryPctOfIncome > dynamicThresholds.primarie ? 'text-down font-semibold' : 'text-up font-semibold'}`}>
                {primaryPctOfIncome > dynamicThresholds.primarie ? 'Non OK' : 'OK'}
              </span>
            </div>
          </div>
        </button>

        {/* Spese Secondarie - White Card */}
        <button
          type="button"
          onClick={() => setActiveChartFilter('secondarie')}
          aria-pressed={activeChartFilter === 'secondarie'}
          className={`w-full cursor-pointer p-4 sm:p-6 rounded-3xl border text-left relative overflow-hidden flex flex-col justify-between min-h-[11rem] md:min-h-[15.5rem] transition-all duration-300 hover:shadow-md hover:scale-[1.01] ${
            activeChartFilter === 'secondarie'
              ? 'bg-orange-50 border-orange-400 ring-4 ring-orange-400/15'
              : 'bg-white border-hairline hover:border-hairline'
          }`}
        >
          <div className={`absolute right-4 top-4 w-12 h-12 rounded-xl flex items-center justify-center transition-colors border ${
            activeChartFilter === 'secondarie'
              ? 'bg-orange-400 border-orange-400 text-white'
              : 'bg-orange-50 border-orange-100 text-orange-400'
          }`}>
            <XCircle className="w-6 h-6" />
          </div>
          <div className="z-10 text-left pr-14 md:pr-0">
            <span className="text-xs text-ink-soft font-bold uppercase tracking-wider block">
              <span className="md:hidden">Spese Sec.</span>
              <span className="hidden md:inline">Spese Secondarie</span>
            </span>
            <span className="hidden md:block text-3xs text-ink-soft font-normal mt-0.5 lowercase">
              (discrezionali)
            </span>
            <div className="mt-3 text-left">
              <div className="flex items-center flex-wrap gap-2.5">
                <h3 className="text-3xl font-extrabold font-display leading-none text-ink">
                  <EuroAmount value={selectedRecord.speseSecondarie} />
                </h3>
                {prevRecord?.speseSecondarie && (
                  <div className="flex flex-col items-start leading-none mt-1">
                    {renderDeltaBadge(selectedRecord.speseSecondarie, prevRecord?.speseSecondarie, false)}
                    <span className="text-3xs text-ink-soft mt-1">rispetto al mese prec.</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Progress bar compared to Entrate */}
          <div className="mt-4 pt-3 border-t border-hairline w-full z-10">
            <div className="hidden md:flex justify-between items-center text-3xs text-ink-soft font-bold mb-1">
              <span>Rapporto Entrate</span>
              <span className={secondaryPctOfIncome > dynamicThresholds.secondarie ? 'text-down font-bold' : 'text-up font-bold'}>
                {formatPercent(secondaryPctOfIncome)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-canvas rounded-full overflow-hidden relative">
                <div
                  className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-orange-300 to-orange-400"
                  style={{ width: `${Math.min((secondaryPctOfIncome / (dynamicThresholds.secondarie + 5)) * 100, 100)}%` }}
                />
                <div className="absolute top-0 bottom-0 w-0.5 bg-slate-300" style={{ left: `${(dynamicThresholds.secondarie / (dynamicThresholds.secondarie + 5)) * 100}%` }} />
              </div>
            </div>
            <div className="flex justify-between items-center text-3xs text-ink-soft mt-1">
              <span>Soglia: {dynamicThresholds.secondarie}% delle entrate</span>
              <span className={`hidden md:inline ${secondaryPctOfIncome > dynamicThresholds.secondarie ? 'text-down font-semibold' : 'text-up font-semibold'}`}>
                {secondaryPctOfIncome > dynamicThresholds.secondarie ? 'Soglia superata' : 'Nei limiti'}
              </span>
              <span className={`md:hidden ${secondaryPctOfIncome > dynamicThresholds.secondarie ? 'text-down font-semibold' : 'text-up font-semibold'}`}>
                {secondaryPctOfIncome > dynamicThresholds.secondarie ? 'Non OK' : 'OK'}
              </span>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
