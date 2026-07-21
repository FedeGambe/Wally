import React from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import EuroAmount from '../EuroAmount';
import { formatEuro } from '../../utils/format';
import { kpiColorAlpha, kpiTextColor, KpiRange } from '../../utils/kpiColorScale';
import type { RecordConsumo } from '../../hooks/useAnalisiConsumiData';

// Estratto da AnalisiConsumi.tsx: header "Riepilogo Settimanale" (esito +
// punteggio + selettore settimana) e i 3 sotto-widget KPI (km effettuati,
// consumo/costo, incorrenza/costo extra).
interface ConsumiRiepilogoSettimanaleProps {
  selectedWeek: RecordConsumo;
  previousWeek: RecordConsumo | null;
  kmDelta: number | null;
  litriDelta: number | null;
  prezzoDelta: number | null;
  deltaClass: (delta: number, dangerWhenPositive: boolean) => string;
  stats: { costo100: KpiRange; kmAlLitro: KpiRange; costoExtra: KpiRange; kmPersi: KpiRange; efficienza: KpiRange };
  kpiCardStyle: (value: number, range: KpiRange, higherIsBetter: boolean) => React.CSSProperties;
  kpiTextStyle: (value: number, range: KpiRange, higherIsBetter: boolean) => React.CSSProperties;
  kmLtLabel: string;
  cost100Label: string;
  kmPersiLabel: string;
  costoExtraLabel: string;
  consumiRecords: RecordConsumo[];
  isWeekDropdownOpen: boolean;
  setIsWeekDropdownOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  setSelectedWeekState: (record: RecordConsumo) => void;
}

export default function ConsumiRiepilogoSettimanale({
  selectedWeek,
  previousWeek,
  kmDelta,
  litriDelta,
  prezzoDelta,
  deltaClass,
  stats,
  kpiCardStyle,
  kpiTextStyle,
  kmLtLabel,
  cost100Label,
  kmPersiLabel,
  costoExtraLabel,
  consumiRecords,
  isWeekDropdownOpen,
  setIsWeekDropdownOpen,
  setSelectedWeekState
}: ConsumiRiepilogoSettimanaleProps) {
  return (
    <div className="bg-white dark:bg-[#0c1425]/45 p-6 rounded-3xl border border-hairline dark:border-slate-800/80 shadow-sm text-left">
      <div className="flex items-center justify-between flex-wrap gap-3 border-b border-hairline dark:border-slate-800/60 pb-4 mb-4">
        <div>
          <h3 className="font-bold text-ink dark:text-slate-100 font-display text-base">Riepilogo Settimanale</h3>
          <p className="text-[11px] text-ink-soft dark:text-slate-500 mt-0.5">{selectedWeek.settimana} · Andamento consumi e inefficienze</p>
        </div>
        <div className="flex items-center gap-8 pr-4">
          <span
            className="px-4 py-1.5 rounded-full text-sm uppercase tracking-wider font-bold text-white transition-all"
            style={{
              backgroundColor: kpiTextColor(selectedWeek.efficienzaPercentuale, { ...stats.efficienza, higherIsBetter: true }),
              boxShadow: `0 0 20px -3px ${kpiColorAlpha(selectedWeek.efficienzaPercentuale, { ...stats.efficienza, higherIsBetter: true }, 0.65)}`
            }}
          >
            {selectedWeek.esitoSettimana}
          </span>

          <div className="text-right">
            <span className="text-[10px] text-ink-soft dark:text-slate-500 font-bold uppercase tracking-wider block">Punteggio</span>
            <span className="text-xl font-black font-display text-ink dark:text-slate-100">
              {typeof selectedWeek.efficienzaPercentuale === 'number' && !isNaN(selectedWeek.efficienzaPercentuale) ? selectedWeek.efficienzaPercentuale.toFixed(2) : '***'}
              <span className="text-xs font-medium text-ink-soft dark:text-slate-500"> /1</span>
            </span>
          </div>

          {/* Selettore settimana: stesso design/layout del selettore Anno globale in Header */}
          <div className="relative select-none shrink-0">
            <button
              onClick={() => setIsWeekDropdownOpen(o => !o)}
              className="flex items-center gap-1.5 bg-canvas dark:bg-slate-800/60 border border-hairline dark:border-slate-700 hover:border-hairline dark:hover:border-slate-600 hover:bg-canvas dark:hover:bg-slate-800 rounded-xl px-3.5 py-2 text-xs font-bold text-ink-soft dark:text-slate-300 transition-all cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 text-ink-soft shrink-0" />
              <span>
                Sett.: <strong className="text-down">{selectedWeek.settimana}</strong>
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-ink-soft shrink-0" />
            </button>

            {isWeekDropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-36 max-h-64 overflow-y-auto bg-white dark:bg-slate-900 border border-hairline dark:border-slate-700 rounded-2xl shadow-xl z-50 p-1.5 flex flex-col gap-0.5 animate-fadeIn">
                {[...consumiRecords].reverse().map((r) => (
                  <button
                    key={`${r.settimana}-${r.data}`}
                    onClick={() => {
                      setSelectedWeekState(r);
                      setIsWeekDropdownOpen(false);
                    }}
                    className={`px-3 py-1.5 text-left text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                      selectedWeek.settimana === r.settimana && selectedWeek.data === r.data
                        ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400'
                        : 'text-ink-soft dark:text-slate-300 hover:bg-canvas dark:hover:bg-slate-800'
                    }`}
                  >
                    {r.settimana}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Sotto-widget 1: Km Effettuati */}
        <div className="bg-canvas dark:bg-slate-900/40 p-4 rounded-2xl border border-hairline dark:border-slate-800/60">
          <span className="text-[10px] text-ink-soft dark:text-slate-500 font-bold uppercase tracking-wider block">Chilometri Effettuati</span>
          <span className="text-4xl font-black font-display text-blue-600 dark:text-rose-400 mt-1 block">
            {selectedWeek.kmEffettuati} <span className="text-lg font-medium text-ink-soft dark:text-slate-500">Km</span>
          </span>
          <span className="text-[10px] text-ink-soft dark:text-slate-400 mt-1.5 block font-mono">
            Rifornimento: {selectedWeek.data} • {selectedWeek.quantitaLitri} Lt • {selectedWeek.prezzoAlLitro} €/Lt
          </span>
          {previousWeek && (
            <div className="mt-1.5 space-y-0.5">
              {kmDelta !== null && (
                <span className={`text-[10px] block ${deltaClass(kmDelta, true)}`}>
                  <span className="font-bold">{kmDelta >= 0 ? '▲' : '▼'} {Math.abs(kmDelta)} km</span> vs sett. precedente
                </span>
              )}
              {litriDelta !== null && (
                <span className={`text-[10px] block ${deltaClass(litriDelta, true)}`}>
                  <span className="font-bold">{litriDelta >= 0 ? '▲' : '▼'} {Math.abs(litriDelta).toFixed(1)} Lt</span> vs sett. precedente
                </span>
              )}
              {prezzoDelta !== null && (
                <span className={`text-[10px] block ${deltaClass(prezzoDelta, true)}`}>
                  <span className="font-bold">{prezzoDelta >= 0 ? '▲' : '▼'} {Math.abs(prezzoDelta).toFixed(3)} €/Lt</span> vs sett. precedente
                </span>
              )}
            </div>
          )}
        </div>

        {/* Sotto-widget 2: Consumo medio e costo */}
        <div className="h-full flex flex-col gap-3">
          <div
            className="p-3.5 rounded-xl border transition-all grid grid-cols-3 gap-2 flex-1 hover:shadow-[0_0_20px_-4px_var(--glow)]"
            style={kpiCardStyle(selectedWeek.kmAlLitro, stats.kmAlLitro, true)}
          >
            <div className="col-span-2 h-full flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider block">Consumo medio (Km/Lt)</span>
              <span className="text-xl font-bold font-display block">
                {typeof selectedWeek.kmAlLitro === 'number' && !isNaN(selectedWeek.kmAlLitro) ? selectedWeek.kmAlLitro.toFixed(1) + ' km/lt' : '***'}
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold font-mono block dark:brightness-150" style={kpiTextStyle(selectedWeek.kmAlLitro, stats.kmAlLitro, true)}>{kmLtLabel}</span>
              <span className="text-xs font-mono opacity-70 block">{stats.kmAlLitro.median.toFixed(1)} km/lt</span>
            </div>
          </div>
          <div
            className="p-3.5 rounded-xl border transition-all grid grid-cols-3 gap-2 flex-1 hover:shadow-[0_0_20px_-4px_var(--glow)]"
            style={kpiCardStyle(selectedWeek.euroPer100Km, stats.costo100, false)}
          >
            <div className="col-span-2 h-full flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider block">Costo / 100 Km</span>
              <span className="text-xl font-bold font-display block"><EuroAmount value={selectedWeek.euroPer100Km} /></span>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold font-mono block dark:brightness-150" style={kpiTextStyle(selectedWeek.euroPer100Km, stats.costo100, false)}>{cost100Label}</span>
              <span className="text-xs font-mono opacity-70 block">{formatEuro(stats.costo100.median)}</span>
            </div>
          </div>
        </div>

        {/* Sotto-widget 3: Incurrenza e costo extra */}
        <div className="h-full flex flex-col gap-3">
          <div
            className="p-3.5 rounded-xl border transition-all grid grid-cols-3 gap-2 flex-1 hover:shadow-[0_0_20px_-4px_var(--glow)]"
            style={kpiCardStyle(selectedWeek.kmPersi, stats.kmPersi, false)}
          >
            <div className="col-span-2 h-full flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider block">Km Persi (Incurrenza)</span>
              <span className="text-xl font-bold font-display block">
                {typeof selectedWeek.kmPersi === 'number' && !isNaN(selectedWeek.kmPersi) ? selectedWeek.kmPersi.toFixed(1) + ' km' : '***'}
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold font-mono block dark:brightness-150" style={kpiTextStyle(selectedWeek.kmPersi, stats.kmPersi, false)}>{kmPersiLabel}</span>
              <span className="text-xs font-mono opacity-70 block">{stats.kmPersi.median.toFixed(1)} km</span>
            </div>
          </div>
          <div
            className="p-3.5 rounded-xl border transition-all grid grid-cols-3 gap-2 flex-1 hover:shadow-[0_0_20px_-4px_var(--glow)]"
            style={kpiCardStyle(selectedWeek.costoExtra, stats.costoExtra, false)}
          >
            <div className="col-span-2 h-full flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider block">Costo Extra</span>
              <span className="text-xl font-bold font-display block"><EuroAmount value={selectedWeek.costoExtra} /></span>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold font-mono block dark:brightness-150" style={kpiTextStyle(selectedWeek.costoExtra, stats.costoExtra, false)}>{costoExtraLabel}</span>
              <span className="text-xs font-mono opacity-70 block">{formatEuro(stats.costoExtra.median)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 px-1 text-[11px] text-ink-soft dark:text-slate-400 leading-relaxed">
        <span className="font-bold block mb-0.5 text-down">💡 Analisi per Federico:</span>
        I KPI e le colorazioni sono valutati automaticamente rispetto alla tua mediana storica di consumo carburante ({typeof stats.kmAlLitro.median === 'number' && !isNaN(stats.kmAlLitro.median) ? stats.kmAlLitro.median.toFixed(1) + ' km/lt' : '***'}).
      </div>
    </div>
  );
}
