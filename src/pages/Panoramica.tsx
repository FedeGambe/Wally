import React from 'react';
import {
  TrendingUp,
  Coins,
  PiggyBank,
  ChevronRight,
  BarChart3,
  Calendar
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';
import Drawer from '../components/Drawer';
import FinanceKpiCard from '../components/FinanceKpiCard';
import { formatEuro, formatPercent } from '../utils/format';
import { usePanoramicaData } from '../hooks/usePanoramicaData';

interface PanoramicaProps {
  selectedYear: string;
  setSelectedYear: (year: string) => void;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
}

export default function Panoramica({
  selectedYear,
  setSelectedYear,
  selectedMonth,
  setSelectedMonth
}: PanoramicaProps) {
  const {
    localSelectedMonth,
    drawerOpen, setDrawerOpen,
    drawerTitle, drawerSubtitle, drawerTransactions, drawerStats,
    filteredRisparmio,
    chartData,
    dynamicThresholds,
    currentMonthData, prevMonthData,
    patrimonioTotale, capitaleDisponibile, capitaleInvestito, capitaleImpegnato,
    handleChartClick, handleOpenMonthDetail,
    entrateDelta, speseDelta, spesePrimDelta, speseSecDelta,
    primPerc, secPerc, invPerc, rispPerc
  } = usePanoramicaData(selectedYear, setSelectedYear, selectedMonth, setSelectedMonth);

  return (
    <div className="space-y-6">
      {/* Top row Wealth widget */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        {/* Wealth card 1 - Capitale Disponibile (Indigo) */}
        <FinanceKpiCard
          type="disponibile"
          title="Capitale Disponibile"
          value={capitaleDisponibile}
          icon={PiggyBank}
          detail={
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Liquidità pronta all'uso ({formatPercent((capitaleDisponibile / patrimonioTotale) * 100)})</span>
            </>
          }
        />

        {/* Wealth card 2 - Capitale Investito (Emerald) */}
        <FinanceKpiCard
          type="investito"
          title="Capitale Investito"
          value={capitaleInvestito}
          icon={TrendingUp}
          detail={
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse"></span>
              <span>Strumenti finanziari attivi ({formatPercent((capitaleInvestito / patrimonioTotale) * 100)})</span>
            </>
          }
        />

        {/* Wealth card 3 - Capitale Accantonato (Amber) */}
        <FinanceKpiCard
          type="impegnato"
          title="Capitale Accantonato"
          value={capitaleImpegnato}
          icon={Coins}
          detail={
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse"></span>
              <span>Fondi vincolati o prenotati ({formatPercent((capitaleImpegnato / patrimonioTotale) * 100)})</span>
            </>
          }
        />

        {/* Wealth card 4 - Capitale Totale (Slate-900) */}
        <FinanceKpiCard
          type="totale"
          title="Capitale Totale"
          value={capitaleDisponibile + capitaleInvestito}
          icon={BarChart3}
          detail={
            <>
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
              <span>Incluso Accantonato: <strong className="text-xs sm:text-[13px] font-black font-mono text-white tracking-tight ml-1">{formatEuro(capitaleDisponibile + capitaleInvestito + capitaleImpegnato)}</strong></span>
            </>
          }
        />
      </div>

      {/* Main KPI Month Strip & Indicators */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm text-left transition-all duration-300 hover:shadow-md">
        <h3 className="text-base font-bold text-slate-800 font-display mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-indigo-605 text-indigo-600" />
          Mese Corrente in Evidenza: <span className="text-indigo-600 font-extrabold capitalize">{currentMonthData.mese} {currentMonthData.anno}</span>
        </h3>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {/* Risparmio */}
          <div className="p-5 rounded-2xl bg-slate-50/55 border border-slate-200/75 flex flex-col justify-between h-32 transition-all duration-300 hover:bg-slate-50">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Risparmio</span>
              <span className="text-2xl font-extrabold font-display text-slate-800 mt-1 block">
                {formatEuro(currentMonthData.risparmioNetto)}
              </span>
            </div>
            <div className="mt-auto flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500 font-medium">Quota: <strong className="font-bold text-slate-700">{formatPercent(rispPerc)}</strong></span>
              {rispPerc >= dynamicThresholds.risparmio ? (
                <span className="inline-flex items-center gap-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-[9px] font-bold px-2 py-0.5 rounded-full">
                  Target {dynamicThresholds.risparmio}% OK ✓
                </span>
              ) : (
                <span className="inline-flex items-center gap-0.5 bg-rose-50 text-rose-700 border border-rose-200/60 text-[9px] font-bold px-2 py-0.5 rounded-full">
                  Sotto Target {dynamicThresholds.risparmio}% ✗
                </span>
              )}
            </div>
          </div>

          {/* Investito */}
          <div className="p-5 rounded-2xl bg-slate-50/55 border border-slate-200/75 flex flex-col justify-between h-32 transition-all duration-300 hover:bg-slate-50">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Capitale Investito</span>
              <span className="text-2xl font-extrabold font-display text-slate-800 mt-1 block">
                {formatEuro(currentMonthData.investito)}
              </span>
            </div>
            <div className="mt-auto flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500 font-medium">Quota: <strong className="font-bold text-slate-700">{formatPercent(invPerc)}</strong></span>
              {invPerc >= dynamicThresholds.investiti ? (
                <span className="inline-flex items-center gap-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-[9px] font-bold px-2 py-0.5 rounded-full">
                  Target {dynamicThresholds.investiti}% OK ✓
                </span>
              ) : (
                <span className="inline-flex items-center gap-0.5 bg-rose-50 text-rose-700 border border-rose-200/60 text-[9px] font-bold px-2 py-0.5 rounded-full">
                  Sotto Target {dynamicThresholds.investiti}% ✗
                </span>
              )}
            </div>
          </div>

          {/* Spese Primarie */}
          <div className="p-5 rounded-2xl bg-slate-50/55 border border-slate-200/75 flex flex-col justify-between h-32 transition-all duration-300 hover:bg-slate-50">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Spese Primarie</span>
              <span className="text-2xl font-extrabold font-display text-slate-800 mt-1 block">
                {formatEuro(currentMonthData.spesePrimarie)}
              </span>
            </div>
            <div className="mt-auto flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500 font-medium">Quota: <strong className="font-bold text-slate-700">{formatPercent(primPerc)}</strong></span>
              {primPerc <= dynamicThresholds.primarie ? (
                <span className="inline-flex items-center gap-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-[9px] font-bold px-2 py-0.5 rounded-full">
                  Sotto Soglia {dynamicThresholds.primarie}% ✓
                </span>
              ) : (
                <span className="inline-flex items-center gap-0.5 bg-rose-50 text-rose-700 border border-rose-200/60 text-[9px] font-bold px-2 py-0.5 rounded-full">
                  Sopra Soglia {dynamicThresholds.primarie}% ✗
                </span>
              )}
            </div>
          </div>

          {/* Spese Secondarie */}
          <div className="p-5 rounded-2xl bg-slate-50/55 border border-slate-200/75 flex flex-col justify-between h-32 transition-all duration-300 hover:bg-slate-50">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Spese Secondarie</span>
              <span className="text-2xl font-extrabold font-display text-slate-800 mt-1 block">
                {formatEuro(currentMonthData.speseSecondarie)}
              </span>
            </div>
            <div className="mt-auto flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500 font-medium">Quota: <strong className="font-bold text-slate-700">{formatPercent(secPerc)}</strong></span>
              {secPerc <= dynamicThresholds.secondarie ? (
                <span className="inline-flex items-center gap-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-[9px] font-bold px-2 py-0.5 rounded-full">
                  Sotto Soglia {dynamicThresholds.secondarie}% ✓
                </span>
              ) : (
                <span className="inline-flex items-center gap-0.5 bg-rose-50 text-rose-700 border border-rose-200/60 text-[9px] font-bold px-2 py-0.5 rounded-full">
                  Sopra Soglia {dynamicThresholds.secondarie}% ✗
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Delta change vs previous month */}
        <div className="mt-4 p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider bg-slate-200 dark:bg-slate-700 px-2.5 py-1 rounded-lg">
              Delta vs {prevMonthData ? `${prevMonthData.mese} ${prevMonthData.anno}` : 'Mese Precedente'}
            </span>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 dark:text-slate-400 font-semibold">Entrate:</span>
              <span className={`font-black text-xs px-2.5 py-0.5 rounded-md ${entrateDelta >= 0 ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400" : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400"}`}>
                {entrateDelta >= 0 ? '+' : ''}{formatPercent(entrateDelta)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 dark:text-slate-400 font-semibold">Uscite Totali:</span>
              <span className={`font-black text-xs px-2.5 py-0.5 rounded-md ${speseDelta <= 0 ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400" : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400"}`}>
                {speseDelta >= 0 ? '+' : ''}{formatPercent(speseDelta)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 dark:text-slate-400 font-semibold">Spese Primarie:</span>
              <span className={`font-black text-xs px-2.5 py-0.5 rounded-md ${spesePrimDelta <= 0 ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400" : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400"}`}>
                {spesePrimDelta >= 0 ? '+' : ''}{formatPercent(spesePrimDelta)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 dark:text-slate-400 font-semibold">Spese Secondarie:</span>
              <span className={`font-black text-xs px-2.5 py-0.5 rounded-md ${speseSecDelta <= 0 ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400" : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400"}`}>
                {speseSecDelta >= 0 ? '+' : ''}{formatPercent(speseSecDelta)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Line Chart & General Status Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Net Trend monthly Line Chart */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm text-left lg:col-span-2 transition-all duration-300 hover:shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-800 font-display text-base">Trend Consumi & Risparmio Mensile</h3>
              <p className="text-xs text-slate-400 mt-1">Confronto tra flussi di risparmio e quota investimenti</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-slate-500 font-semibold">
                <span className="w-3 h-1.5 bg-indigo-600 rounded-full" /> Risparmio
              </span>
              <span className="flex items-center gap-1.5 text-slate-500 font-semibold">
                <span className="w-3 h-1.5 bg-fuchsia-500 rounded-full" /> Investito
              </span>
            </div>
          </div>

          <div className="h-68">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                onClick={handleChartClick}
              >
                <defs>
                  <linearGradient id="colorRisparmio" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorInvestito" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d946ef" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#d946ef" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="uniqueKey"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => {
                    const parts = String(val).split(' ');
                    if (parts.length === 2) {
                      const m = parts[0].slice(0, 3);
                      const y = parts[1].slice(2);
                      return selectedYear === 'Tutti' ? `${m} '${y}` : m;
                    }
                    return val;
                  }}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `€${Number(val).toLocaleString('it-IT', { useGrouping: true })}`}
                />
                <Tooltip
                  formatter={(value: any) => [formatEuro(value), '']}
                  contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '16px', color: '#fff', fontSize: '12px' }}
                />
                <Area
                  type="monotone"
                  name="Risparmio Netto"
                  dataKey="risparmioNetto"
                  stroke="#4f46e5"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorRisparmio)"
                  dot={(props: any) => {
                    const { cx, cy, payload } = props;
                    const isSelected = payload.mese.toLowerCase() === localSelectedMonth.toLowerCase();
                    return (
                      <circle
                        key={payload.mese + '-risparmio'}
                        cx={cx}
                        cy={cy}
                        r={isSelected ? 6 : 3}
                        fill={isSelected ? '#4f46e5' : '#fff'}
                        stroke="#4f46e5"
                        strokeWidth={isSelected ? 3 : 1.5}
                        className="cursor-pointer transition-all"
                      />
                    );
                  }}
                  activeDot={{ r: 6, onClick: (e, payload: any) => handleOpenMonthDetail(payload.payload.mese, payload.payload.anno) }}
                />
                <Area
                  type="monotone"
                  name="Quota Investita"
                  dataKey="investito"
                  stroke="#d946ef"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorInvestito)"
                  dot={(props: any) => {
                    const { cx, cy, payload } = props;
                    const isSelected = payload.mese.toLowerCase() === localSelectedMonth.toLowerCase();
                    return (
                      <circle
                        key={payload.mese + '-investito'}
                        cx={cx}
                        cy={cy}
                        r={isSelected ? 6 : 3}
                        fill={isSelected ? '#d946ef' : '#fff'}
                        stroke="#d946ef"
                        strokeWidth={isSelected ? 3 : 1.5}
                        className="cursor-pointer transition-all"
                      />
                    );
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Summary Widget */}
        <div className="bg-slate-900 border border-slate-800 text-white p-6 rounded-3xl shadow-sm text-left flex flex-col justify-between transition-all duration-300 hover:shadow-md">
          <div>
            <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider">Rendiconto Mese Corrente</span>
            <h3 className="text-2.5xl font-black font-display mt-2 text-white leading-none">Disponibilità Netta</h3>
            <p className="text-xs text-slate-300 mt-3 leading-relaxed">
              Sintesi dei flussi di questo mese ricavati direttamente dal foglio Risparmio.
            </p>
          </div>

          <div className="my-5 space-y-3 px-1 border-t border-b border-slate-800 py-5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Entrate registrate:</span>
              <span className="font-bold font-display text-white">{formatEuro(currentMonthData.entrate)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Spese Primarie:</span>
              <span className="font-bold font-display text-slate-300">{formatEuro(currentMonthData.spesePrimarie)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Spese Secondarie:</span>
              <span className="font-bold font-display text-slate-300">{formatEuro(currentMonthData.speseSecondarie)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Uscite totali:</span>
              <span className="font-bold font-display text-slate-300">{formatEuro(currentMonthData.speseTotali)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Capitale Investito:</span>
              <span className="font-bold font-display text-indigo-300">{formatEuro(currentMonthData.investito)}</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs">
              <span className="text-slate-200 font-bold">Risparmio Netto:</span>
              <span className="text-base font-black font-display text-emerald-400">{formatEuro(currentMonthData.risparmioNetto)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-300 bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Soglia Target ({dynamicThresholds.risparmio}%)
            </span>
            <span className="font-extrabold text-emerald-400">{formatEuro(currentMonthData.entrate * (dynamicThresholds.risparmio / 100))}</span>
          </div>
        </div>
      </div>

      {/* Balancing table for N Months */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm text-left transition-all duration-300 hover:shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-slate-800 font-display text-base">Bilancio Storico Mensile</h3>
            <p className="text-xs text-slate-400 mt-1">Sintesi consolidata ricavata dal foglio Risparmio</p>
          </div>
          <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-2.5 py-1 rounded-full uppercase tracking-wider">
            Storico: {filteredRisparmio.length} mesi
          </span>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-sm text-left">
            <thead className="bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wider border-b border-indigo-100">
              <tr>
                <th className="px-6 py-4 rounded-tl-2xl">Mese / Anno</th>
                <th className="px-6 py-4 text-right">Entrate</th>
                <th className="px-6 py-4 text-right">Spese Primarie</th>
                <th className="px-6 py-4 text-right">Spese Secondarie</th>
                <th className="px-6 py-4 text-right">Investito</th>
                <th className="px-6 py-4 text-right">Risparmio Netto</th>
                <th className="px-6 py-4 text-right">Quota Netto %</th>
                <th className="px-6 py-4 text-right rounded-tr-2xl">Dettagli</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 text-slate-700 font-medium">
              {[...filteredRisparmio].reverse().map((r, idx) => {
                const savingQuota = (r.risparmioNetto / r.entrate) * 100;
                return (
                  <tr key={idx} className="hover:bg-slate-55/40 hover:bg-slate-50/50 transition-colors duration-155">
                    <td className="px-6 py-3.5 font-bold text-slate-850 capitalize">
                      {r.mese} {r.anno}
                    </td>
                    <td className="px-6 py-3.5 text-right font-bold text-emerald-600">
                      {formatEuro(r.entrate)}
                    </td>
                    <td className="px-6 py-3.5 text-right text-slate-600">
                      {formatEuro(r.spesePrimarie)}
                    </td>
                    <td className="px-6 py-3.5 text-right text-slate-600">
                      {formatEuro(r.speseSecondarie)}
                    </td>
                    <td className="px-6 py-3.5 text-right text-indigo-650 text-indigo-600 font-semibold">
                      {formatEuro(r.investito)}
                    </td>
                    <td className={`px-6 py-3.5 text-right font-extrabold ${r.risparmioNetto >= 0 ? "text-emerald-500" : "text-rose-500"
                      }`}>
                      {formatEuro(r.risparmioNetto)}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${savingQuota >= 35
                        ? "bg-emerald-100 text-emerald-800"
                        : savingQuota >= 10
                          ? "bg-amber-100 text-amber-800"
                          : "bg-rose-100 text-rose-800"
                        }`}>
                        {formatPercent(savingQuota)}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <button
                        onClick={() => handleOpenMonthDetail(r.mese, r.anno)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-indigo-600 hover:text-white hover:bg-indigo-600 rounded-xl border border-indigo-200 hover:border-transparent transition-all duration-150 cursor-pointer"
                      >
                        Analizza
                        <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer detailed details */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={drawerTitle}
        subtitle={drawerSubtitle}
        transactions={drawerTransactions}
        stats={drawerStats}
      />
    </div>
  );
}
