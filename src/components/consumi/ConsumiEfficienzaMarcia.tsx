import React from 'react';
import { Gauge } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Line,
  ComposedChart
} from 'recharts';
import { useIsMobile } from '../../hooks/useIsMobile';
import { formatEuro } from '../../utils/format';
import { formatSettimanaTick, formatAxisNumber, formatAxisEuro, KmLtTooltip, TimeRangeToggle } from './ConsumiChartHelpers';
import type { RecordConsumo, TimeRange } from '../../hooks/useAnalisiConsumiData';

// Estratto da AnalisiConsumi.tsx: CONTENITORE 1 "Efficienza di Marcia"
// (Evoluzione Km/Litro + Costo per 100 Km).
interface ConsumiEfficienzaMarciaProps {
  kmLtChartData: RecordConsumo[];
  kmLtChartRange: TimeRange;
  setKmLtChartRange: (range: TimeRange) => void;
  euro100ChartData: RecordConsumo[];
  euro100ChartRange: TimeRange;
  setEuro100ChartRange: (range: TimeRange) => void;
  handleChartClick: (event: any) => void;
}

export default function ConsumiEfficienzaMarcia({
  kmLtChartData,
  kmLtChartRange,
  setKmLtChartRange,
  euro100ChartData,
  euro100ChartRange,
  setEuro100ChartRange,
  handleChartClick
}: ConsumiEfficienzaMarciaProps) {
  const isMobile = useIsMobile();

  return (
    <div className="bg-white dark:bg-[#0c1425]/45 p-6 rounded-3xl border border-hairline dark:border-slate-800/80 shadow-sm text-left">
      <h3 className="font-bold text-ink dark:text-slate-100 font-display text-sm flex items-center gap-1.5 mb-4">
        <Gauge className="w-4.5 h-4.5 text-rose-500 dark:text-rose-400" />
        Efficienza di Marcia
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Km / Litro */}
        <div className="p-4 rounded-2xl border border-hairline dark:border-slate-800/60 bg-canvas/40 dark:bg-slate-900/20">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className="font-bold text-ink dark:text-slate-200 font-display text-xs">Evoluzione Km / Litro</h4>
            <TimeRangeToggle value={kmLtChartRange} onChange={setKmLtChartRange} />
          </div>
          <p className="text-[11px] text-ink-soft dark:text-slate-500 mb-4">Km/lt calcolato (verde/rosso vs media) e km/lt bordo auto (grigio)</p>
          <div className="h-44">
            {kmLtChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-450 dark:text-slate-550 text-xs">Nessun dato registrato</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={kmLtChartData}
                  margin={{ top: 10, right: 10, left: isMobile ? 0 : 10, bottom: 0 }}
                  onClick={handleChartClick}
                >
                  <defs>
                    <linearGradient id="colorKmAlLitro" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#ef4444" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-slate-100, #f1f5f9)" className="dark:opacity-10" />
                  <XAxis dataKey="settimana" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={formatSettimanaTick} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} width={isMobile ? 40 : 60} tickFormatter={formatAxisNumber} domain={[(dataMin: number) => Math.max(0, dataMin - 0.75), (dataMax: number) => dataMax + 0.75]} />
                  <Tooltip content={<KmLtTooltip />} />
                  <Line type="monotone" dataKey="kmAlLitroAuto" stroke="#94a3b8" strokeOpacity={0.6} strokeWidth={2} strokeDasharray="4 4" dot={false} activeDot={false} connectNulls={false} />
                  <Area type="monotone" dataKey="kmAlLitro" stroke="url(#colorKmAlLitro)" strokeWidth={2.5} fill="url(#colorKmAlLitro)" fillOpacity={0.18} dot={false} activeDot={{ r: 5, cursor: 'pointer' }} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* €/100km */}
        <div className="p-4 rounded-2xl border border-hairline dark:border-slate-800/60 bg-canvas/40 dark:bg-slate-900/20">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className="font-bold text-ink dark:text-slate-200 font-display text-xs">Costo per 100 Km</h4>
            <TimeRangeToggle value={euro100ChartRange} onChange={setEuro100ChartRange} />
          </div>
          <p className="text-[11px] text-ink-soft dark:text-slate-500 mb-4">Spesa carburante normalizzata ogni 100 km percorsi</p>
          <div className="h-44">
            {euro100ChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-450 dark:text-slate-550 text-xs">Nessun dato registrato</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={euro100ChartData}
                  margin={{ top: 10, right: 10, left: isMobile ? 0 : 10, bottom: 0 }}
                  onClick={handleChartClick}
                >
                  <defs>
                    <linearGradient id="colorEuro100" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-slate-100, #f1f5f9)" className="dark:opacity-10" />
                  <XAxis dataKey="settimana" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={formatSettimanaTick} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} width={isMobile ? 44 : 60} tickFormatter={formatAxisEuro} domain={[(dataMin: number) => Math.max(0, dataMin * 0.9), 'auto']} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: 'none', borderRadius: '12px' }}
                    labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                    itemStyle={{ color: '#f59e0b' }}
                    formatter={(value: any) => [formatEuro(value), '€/100km']}
                  />
                  <Area type="monotone" dataKey="euroPer100Km" stroke="#f59e0b" strokeWidth={2.5} fillOpacity={1} fill="url(#colorEuro100)" dot={false} activeDot={{ r: 5, cursor: 'pointer' }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
