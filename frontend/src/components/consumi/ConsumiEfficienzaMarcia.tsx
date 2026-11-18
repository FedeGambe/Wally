import React from 'react';
import { Gauge } from 'lucide-react';
import {
  ResponsiveContainer,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Line,
  ComposedChart,
  ReferenceLine
} from 'recharts';
import { useIsMobile } from '../../hooks/useIsMobile';
import { formatEuro } from '../../utils/format';
import { monthAxisProps, formatAxisNumber, formatAxisEuro, fmtNum, KmLtTooltip, TOOLTIP_BOX, TOOLTIP_LABEL, tooltipItem } from './ConsumiChartHelpers';
import type { RecordConsumo } from '../../hooks/useAnalisiConsumiData';

// Estratto da AnalisiConsumi.tsx: CONTENITORE 1 "Efficienza di Marcia"
// (Km/Litro + Costo per 100 Km). In ogni grafico: il valore settimanale in
// leggero, la media mobile su 4 settimane in evidenza (l'andamento vero, senza
// gli sbalzi dei rifornimenti) e la mediana storica come linea di riferimento.
interface ConsumiEfficienzaMarciaProps {
  chartData: RecordConsumo[];
  medianaKmAlLitro: number;
  medianaCosto100: number;
  handleChartClick: (event: any) => void;
}

const GRIGIO = '#94a3b8';

// Etichetta della linea di riferimento (mediana), in alto a destra
const etichettaMediana = (testo: string) => ({ value: testo, position: 'insideTopRight' as const, fill: GRIGIO, fontSize: 10 });

export default function ConsumiEfficienzaMarcia({
  chartData,
  medianaKmAlLitro,
  medianaCosto100,
  handleChartClick
}: ConsumiEfficienzaMarciaProps) {
  const isMobile = useIsMobile();
  const vuoto = <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-500 text-xs">Nessun dato registrato</div>;

  return (
    <div className="bg-white dark:bg-[#0c1425]/45 p-6 rounded-3xl border border-hairline dark:border-slate-800/80 shadow-sm text-left">
      <h2 className="font-bold text-ink dark:text-slate-100 font-display text-sm flex items-center gap-1.5 mb-4">
        <Gauge className="w-4.5 h-4.5 text-rose-500 dark:text-rose-400" />
        Efficienza di Marcia
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Km / Litro */}
        <div className="p-4 rounded-2xl border border-hairline dark:border-slate-800/60 bg-canvas/40 dark:bg-slate-900/20">
          <h3 className="font-bold text-ink dark:text-slate-200 font-display text-xs mb-1">Km / Litro</h3>
          <p className="text-2xs text-ink-soft dark:text-slate-500 mb-4">Linea piena: media delle ultime 4 settimane. Area: singola settimana. Tratteggio grigio: dato del computer di bordo</p>
          <div className="h-44">
            {chartData.length === 0 ? vuoto : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: isMobile ? 0 : 10, bottom: 0 }}
                  onClick={handleChartClick}
                >
                  <defs>
                    <linearGradient id="colorKmAlLitro" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-slate-100, #f1f5f9)" className="dark:opacity-10" />
                  <XAxis stroke={GRIGIO} fontSize={10} tickLine={false} axisLine={false} {...monthAxisProps(chartData, isMobile)} />
                  <YAxis stroke={GRIGIO} fontSize={10} tickLine={false} axisLine={false} width={isMobile ? 40 : 60} tickFormatter={formatAxisNumber} domain={[(dataMin: number) => Math.max(0, dataMin - 0.75), (dataMax: number) => dataMax + 0.75]} />
                  <Tooltip content={<KmLtTooltip />} />
                  <ReferenceLine y={medianaKmAlLitro} stroke={GRIGIO} strokeDasharray="2 4" label={etichettaMediana(`mediana ${fmtNum(medianaKmAlLitro, 1)}`)} />
                  <Line type="monotone" dataKey="kmAlLitroAuto" stroke={GRIGIO} strokeOpacity={0.6} strokeWidth={1.5} strokeDasharray="4 4" dot={false} activeDot={false} connectNulls={false} />
                  <Area type="monotone" dataKey="kmAlLitro" stroke="#10b981" strokeOpacity={0.35} strokeWidth={1.5} fill="url(#colorKmAlLitro)" dot={false} activeDot={{ r: 5, cursor: 'pointer' }} />
                  <Line type="monotone" dataKey="kmAlLitroMedia4" stroke="#10b981" strokeWidth={2.5} dot={false} activeDot={false} connectNulls />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* €/100km */}
        <div className="p-4 rounded-2xl border border-hairline dark:border-slate-800/60 bg-canvas/40 dark:bg-slate-900/20">
          <h3 className="font-bold text-ink dark:text-slate-200 font-display text-xs mb-1">Costo per 100 Km</h3>
          <p className="text-2xs text-ink-soft dark:text-slate-500 mb-4">Linea piena: media delle ultime 4 settimane. Area: singola settimana</p>
          <div className="h-44">
            {chartData.length === 0 ? vuoto : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: isMobile ? 0 : 10, bottom: 0 }}
                  onClick={handleChartClick}
                >
                  <defs>
                    <linearGradient id="colorEuro100" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-slate-100, #f1f5f9)" className="dark:opacity-10" />
                  <XAxis stroke={GRIGIO} fontSize={10} tickLine={false} axisLine={false} {...monthAxisProps(chartData, isMobile)} />
                  <YAxis stroke={GRIGIO} fontSize={10} tickLine={false} axisLine={false} width={isMobile ? 44 : 60} tickFormatter={formatAxisEuro} domain={[(dataMin: number) => Math.max(0, dataMin * 0.9), 'auto']} />
                  <Tooltip
                    contentStyle={TOOLTIP_BOX}
                    labelStyle={TOOLTIP_LABEL}
                    separator=": "
                    itemStyle={tooltipItem('#f59e0b')}
                    formatter={(value: any, name: any) => [formatEuro(value), name === 'euroPer100KmMedia4' ? 'Media 4 sett.' : 'Settimana']}
                  />
                  <ReferenceLine y={medianaCosto100} stroke={GRIGIO} strokeDasharray="2 4" label={etichettaMediana(`mediana ${formatEuro(medianaCosto100)}`)} />
                  <Area type="monotone" dataKey="euroPer100Km" stroke="#f59e0b" strokeOpacity={0.35} strokeWidth={1.5} fill="url(#colorEuro100)" dot={false} activeDot={{ r: 5, cursor: 'pointer' }} />
                  <Line type="monotone" dataKey="euroPer100KmMedia4" stroke="#f59e0b" strokeWidth={2.5} dot={false} activeDot={false} connectNulls />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
