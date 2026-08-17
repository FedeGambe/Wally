import React from 'react';
import { Car } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { useIsMobile } from '../../hooks/useIsMobile';
import { formatSettimanaTick, formatAxisNumber, formatAxisEuro, TimeRangeToggle } from './ConsumiChartHelpers';
import type { RecordConsumo, TimeRange } from '../../hooks/useAnalisiConsumiData';

// Estratto da AnalisiConsumi.tsx: CONTENITORE 2 "Percorrenza & Prezzo
// Carburante" (Km percorsi per settimana + Andamento prezzo €/Lt).
interface ConsumiPercorrenzaPrezzoProps {
  kmChartData: RecordConsumo[];
  kmChartRange: TimeRange;
  setKmChartRange: (range: TimeRange) => void;
  prezzoChartData: RecordConsumo[];
  prezzoChartRange: TimeRange;
  setPrezzoChartRange: (range: TimeRange) => void;
  handleChartClick: (event: any) => void;
}

export default function ConsumiPercorrenzaPrezzo({
  kmChartData,
  kmChartRange,
  setKmChartRange,
  prezzoChartData,
  prezzoChartRange,
  setPrezzoChartRange,
  handleChartClick
}: ConsumiPercorrenzaPrezzoProps) {
  const isMobile = useIsMobile();

  return (
    <div className="bg-white dark:bg-[#0c1425]/45 p-6 rounded-3xl border border-hairline dark:border-slate-800/80 shadow-sm text-left">
      <h3 className="font-bold text-ink dark:text-slate-100 font-display text-sm flex items-center gap-1.5 mb-4">
        <Car className="w-4.5 h-4.5 text-rose-500 dark:text-rose-400" />
        Percorrenza & Prezzo Carburante
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Km settimanali */}
        <div className="p-4 rounded-2xl border border-hairline dark:border-slate-800/60 bg-canvas/40 dark:bg-slate-900/20">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className="font-bold text-ink dark:text-slate-200 font-display text-xs">Chilometri Percorsi per Settimana</h4>
            <TimeRangeToggle value={kmChartRange} onChange={setKmChartRange} />
          </div>
          <p className="text-2xs text-ink-soft dark:text-slate-500 mb-4">Grafico storico della mobilità settimanale. Clicca sui punti per ispezionare.</p>
          <div className="h-44">
            {kmChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-450 dark:text-slate-550 text-xs">Nessun dato registrato</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={kmChartData}
                  margin={{ top: 10, right: 10, left: isMobile ? 0 : 10, bottom: 0 }}
                  onClick={handleChartClick}
                >
                  <defs>
                    <linearGradient id="colorKmEffettuati" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#e11d48" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#e11d48" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-slate-100, #f1f5f9)" className="dark:opacity-10" />
                  <XAxis dataKey="settimana" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={formatSettimanaTick} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} width={isMobile ? 40 : 60} tickFormatter={formatAxisNumber} domain={[(dataMin: number) => Math.max(0, dataMin * 0.9), 'auto']} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: 'none', borderRadius: '12px' }}
                    labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                    itemStyle={{ color: '#fda4af' }}
                    formatter={(value: any) => [`${value} Km`, 'Km Effettuati']}
                  />
                  <Area
                    type="monotone"
                    dataKey="kmEffettuati"
                    name="Km percorsi"
                    stroke="#e11d48"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorKmEffettuati)"
                    dot={false}
                    activeDot={{ r: 6, fill: '#e11d48', cursor: 'pointer' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* €/Lt */}
        <div className="p-4 rounded-2xl border border-hairline dark:border-slate-800/60 bg-canvas/40 dark:bg-slate-900/20">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className="font-bold text-ink dark:text-slate-200 font-display text-xs">Andamento Prezzo Carburante (€/Lt)</h4>
            <TimeRangeToggle value={prezzoChartRange} onChange={setPrezzoChartRange} />
          </div>
          <p className="text-2xs text-ink-soft dark:text-slate-500 mb-4">Storicità fluttuazione costi benzina</p>
          <div className="h-44">
            {prezzoChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-450 dark:text-slate-550 text-xs">Nessun dato registrato</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={prezzoChartData}
                  margin={{ top: 10, right: 10, left: isMobile ? 0 : 10, bottom: 0 }}
                  onClick={handleChartClick}
                >
                  <defs>
                    <linearGradient id="colorPrezzoAlLitro" x1="0" y1="0" x2="0" y2="1">
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
                    formatter={(value: any) => [`€${value}`, 'Prezzo al Lt']}
                  />
                  <Area type="monotone" dataKey="prezzoAlLitro" stroke="#f59e0b" strokeWidth={2.5} fillOpacity={1} fill="url(#colorPrezzoAlLitro)" dot={false} activeDot={{ r: 5, cursor: 'pointer' }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
