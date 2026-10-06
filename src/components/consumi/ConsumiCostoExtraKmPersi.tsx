import React from 'react';
import { AlertOctagon } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { useIsMobile } from '../../hooks/useIsMobile';
import { formatEuro } from '../../utils/format';
import { monthAxisProps, fmtNum, formatAxisNumber, formatAxisEuro, SegmentedToggle, TimeRangeToggle } from './ConsumiChartHelpers';
import type { RecordConsumo, TimeRange, ExtraMode } from '../../hooks/useAnalisiConsumiData';

// Estratto da AnalisiConsumi.tsx: CONTENITORE 3 "Costo Extra & Km Persi"
// (dovuti a inefficienza di guida), con toggle Accumulato/€ per Km.
interface ConsumiCostoExtraKmPersiProps {
  costoExtraChartData: RecordConsumo[];
  costoExtraChartRange: TimeRange;
  setCostoExtraChartRange: (range: TimeRange) => void;
  kmPersiChartData: RecordConsumo[];
  kmPersiChartRange: TimeRange;
  setKmPersiChartRange: (range: TimeRange) => void;
  extraMode: ExtraMode;
  setExtraMode: (mode: ExtraMode) => void;
  handleChartClick: (event: any) => void;
}

export default function ConsumiCostoExtraKmPersi({
  costoExtraChartData,
  costoExtraChartRange,
  setCostoExtraChartRange,
  kmPersiChartData,
  kmPersiChartRange,
  setKmPersiChartRange,
  extraMode,
  setExtraMode,
  handleChartClick
}: ConsumiCostoExtraKmPersiProps) {
  const isMobile = useIsMobile();

  return (
    <div className="bg-white dark:bg-[#0c1425]/45 p-6 rounded-3xl border border-hairline dark:border-slate-800/80 shadow-sm text-left">
      <div className="flex items-start justify-between gap-2 mb-4">
        <h3 className="font-bold text-ink dark:text-slate-100 font-display text-sm flex items-center gap-1.5">
          <AlertOctagon className="w-4.5 h-4.5 text-rose-500 dark:text-rose-400" />
          Costo Extra & Km Persi
        </h3>
        <SegmentedToggle<ExtraMode>
          value={extraMode}
          onChange={setExtraMode}
          options={[{ value: 'accumulato', label: 'Accumulato' }, { value: 'perKm', label: '€/Km' }]}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Costo extra */}
        <div className="p-4 rounded-2xl border border-hairline dark:border-slate-800/60 bg-canvas/40 dark:bg-slate-900/20">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className="font-bold text-ink dark:text-slate-200 font-display text-xs">Costo Extra da Inefficienza Carburante</h4>
            <TimeRangeToggle value={costoExtraChartRange} onChange={setCostoExtraChartRange} />
          </div>
          <p className="text-2xs text-ink-soft dark:text-slate-500 mb-4">Costo in euro (€) dovuto ad andamento guida inefficiente sopra la media consigliata</p>
          <div className="h-44">
            {costoExtraChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-450 dark:text-slate-550 text-xs">Nessun dato registrato</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={costoExtraChartData}
                  margin={{ top: 10, right: 10, left: isMobile ? 0 : 10, bottom: 0 }}
                  onClick={handleChartClick}
                >
                  <defs>
                    <linearGradient id="colorCostoExtra" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-slate-100, #f1f5f9)" className="dark:opacity-10" />
                  <XAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} {...monthAxisProps(costoExtraChartData, isMobile)} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} width={isMobile ? 44 : 60} tickFormatter={formatAxisEuro} domain={[(dataMin: number) => Math.max(0, dataMin * 0.9), 'auto']} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: 'none', borderRadius: '12px' }}
                    labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                    itemStyle={{ color: '#f97316' }}
                    formatter={(value: any) => [
                      formatEuro(value),
                      extraMode === 'perKm' ? 'Costo Extra/Km' : 'Costo Extra'
                    ]}
                  />
                  <Area type="monotone" dataKey="costoExtra" stroke="#f97316" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCostoExtra)" dot={false} activeDot={{ r: 5, cursor: 'pointer' }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Km persi */}
        <div className="p-4 rounded-2xl border border-hairline dark:border-slate-800/60 bg-canvas/40 dark:bg-slate-900/20">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className="font-bold text-ink dark:text-slate-200 font-display text-xs">Km Persi per Inefficienza</h4>
            <TimeRangeToggle value={kmPersiChartRange} onChange={setKmPersiChartRange} />
          </div>
          <p className="text-2xs text-ink-soft dark:text-slate-500 mb-4">Chilometri "persi" per uno stile di guida sopra la media consigliata</p>
          <div className="h-44">
            {kmPersiChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-450 dark:text-slate-550 text-xs">Nessun dato registrato</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={kmPersiChartData}
                  margin={{ top: 10, right: 10, left: isMobile ? 0 : 10, bottom: 0 }}
                  onClick={handleChartClick}
                >
                  <defs>
                    <linearGradient id="colorKmPersi" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#e11d48" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#e11d48" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-slate-100, #f1f5f9)" className="dark:opacity-10" />
                  <XAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} {...monthAxisProps(kmPersiChartData, isMobile)} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} width={isMobile ? 40 : 60} tickFormatter={formatAxisNumber} domain={[(dataMin: number) => Math.max(0, dataMin * 0.9), 'auto']} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: 'none', borderRadius: '12px' }}
                    labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                    itemStyle={{ color: '#fda4af' }}
                    formatter={(value: any) => [`${fmtNum(value)} Km`, extraMode === 'perKm' ? 'Km Persi/Km' : 'Km Persi']}
                  />
                  <Area type="monotone" dataKey="kmPersi" stroke="#e11d48" strokeWidth={2.5} fillOpacity={1} fill="url(#colorKmPersi)" dot={false} activeDot={{ r: 5, cursor: 'pointer' }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
