import React, { useState } from 'react';
import { TrendingUp } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';
import { formatEuro } from '../../utils/format';

interface PanoramicaTrendChartProps {
  chartData: any[];
  cumulativeChartData: any[];
  localSelectedMonth: string;
  selectedYear: string;
  isMobile: boolean;
  handleChartClick: (e: any) => void;
  handleOpenMonthDetail: (mese: string, anno: number) => void;
}

// Tooltip custom del grafico Trend Risparmio: nome della variabile in grassetto
// col colore della linea, cifra in bianco (invece del default senza nome).
function renderTrendTooltip({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div style={{ background: '#1e293b', border: 'none', borderRadius: '16px', color: '#fff', fontSize: '12px', padding: '10px 14px' }}>
      <div className="font-bold" style={{ marginBottom: 6 }}>{label}</div>
      {payload.map((p: any, idx: number) => (
        <div key={idx} className="flex items-center justify-between gap-4" style={{ marginTop: idx > 0 ? 4 : 0 }}>
          <span className="font-bold" style={{ color: p.color }}>{p.name}</span>
          <span className="text-white font-mono">{formatEuro(Number(p.value))}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Grafico ad area "Trend Risparmio: investimenti e risparmi", con toggle
 * Mensile/Cumulato. I punti sono cliccabili (handleChartClick/handleOpenMonthDetail)
 * per aprire il drawer di dettaglio del mese.
 */
export default function PanoramicaTrendChart({
  chartData,
  cumulativeChartData,
  localSelectedMonth,
  selectedYear,
  isMobile,
  handleChartClick,
  handleOpenMonthDetail
}: PanoramicaTrendChartProps) {
  // Vista del grafico: mensile (aree separate, come sempre) o cumulato (le
  // stesse due aree impilate una sopra l'altra con stackId).
  const [trendChartMode, setTrendChartMode] = useState<'mensile' | 'cumulato'>('mensile');

  return (
    <div className="bg-white p-6 rounded-3xl border border-hairline shadow-sm text-left lg:col-span-2 transition-all duration-300 hover:shadow-md flex flex-col">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <div>
          <h3 className="font-bold text-ink font-display text-base flex items-center gap-1.5">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <span className="md:hidden">Trend Risparmio</span>
            <span className="hidden md:inline">Trend Risparmio: investimenti e risparmi</span>
          </h3>
          <p className="text-xs text-ink-soft mt-1">Confronto tra flussi di risparmio e quota investimenti</p>
        </div>

        {/* Toggle Mensile/Cumulato + legenda sotto: colore della pagina Panoramica (blue-600) */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="flex bg-canvas p-1 rounded-xl gap-0.5 border border-hairline select-none">
            <button
              onClick={() => setTrendChartMode('mensile')}
              className={`text-[10px] px-3 py-1.5 font-extrabold rounded-lg transition-all cursor-pointer ${
                trendChartMode === 'mensile' ? 'bg-blue-600 text-white shadow-sm' : 'text-ink-soft hover:text-blue-600'
              }`}
            >
              Mensile
            </button>
            <button
              onClick={() => setTrendChartMode('cumulato')}
              className={`text-[10px] px-3 py-1.5 font-extrabold rounded-lg transition-all cursor-pointer ${
                trendChartMode === 'cumulato' ? 'bg-blue-600 text-white shadow-sm' : 'text-ink-soft hover:text-blue-600'
              }`}
            >
              Cumulato
            </button>
          </div>

          {/* Legenda: colori allineati esattamente allo stroke delle due Area sotto */}
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-ink-soft font-semibold">
              <span className="w-3 h-1.5 bg-fuchsia-500 rounded-full" /> Risparmio
            </span>
            <span className="flex items-center gap-1.5 text-ink-soft font-semibold">
              <span className="w-3 h-1.5 bg-sky-500 rounded-full" /> Investito
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 pointer-events-none md:pointer-events-auto">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={trendChartMode === 'cumulato' ? cumulativeChartData : chartData}
            margin={{ top: 10, right: 10, left: isMobile ? 0 : 10, bottom: 0 }}
            onClick={handleChartClick}
          >
            <defs>
              <linearGradient id="colorRisparmio" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#d946ef" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#d946ef" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorInvestito" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
              </linearGradient>
              {/* Gradienti più pieni per la vista Cumulato: le due aree impilate
                  con lo stesso riempimento tenue di prima si distinguevano poco. */}
              <linearGradient id="colorRisparmioCumulato" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#d946ef" stopOpacity={0.65} />
                <stop offset="95%" stopColor="#d946ef" stopOpacity={0.25} />
              </linearGradient>
              <linearGradient id="colorInvestitoCumulato" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.65} />
                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.25} />
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
              width={isMobile ? 44 : 60}
              tickFormatter={(val) => `€${Number(val).toLocaleString('it-IT', { useGrouping: true })}`}
            />
            <Tooltip content={renderTrendTooltip} />
            <Area
              type="monotone"
              name={trendChartMode === 'cumulato' ? 'Risparmio Cumulato' : 'Risparmio Netto'}
              dataKey={trendChartMode === 'cumulato' ? 'risparmioCumulato' : 'risparmioNetto'}
              stroke="#d946ef"
              strokeWidth={2.5}
              fillOpacity={1}
              fill={trendChartMode === 'cumulato' ? 'url(#colorRisparmioCumulato)' : 'url(#colorRisparmio)'}
              dot={(props: any) => {
                const { cx, cy, payload } = props;
                const isSelected = payload.mese.toLowerCase() === localSelectedMonth.toLowerCase();
                return (
                  <circle
                    key={payload.mese + '-risparmio'}
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
              activeDot={{ r: 6, onClick: (e, payload: any) => handleOpenMonthDetail(payload.payload.mese, payload.payload.anno) }}
            />
            <Area
              type="monotone"
              name={trendChartMode === 'cumulato' ? 'Investito Cumulato' : 'Quota Investita'}
              dataKey={trendChartMode === 'cumulato' ? 'investitoCumulato' : 'investito'}
              stroke="#0ea5e9"
              strokeWidth={2.5}
              fillOpacity={1}
              fill={trendChartMode === 'cumulato' ? 'url(#colorInvestitoCumulato)' : 'url(#colorInvestito)'}
              dot={(props: any) => {
                const { cx, cy, payload } = props;
                const isSelected = payload.mese.toLowerCase() === localSelectedMonth.toLowerCase();
                return (
                  <circle
                    key={payload.mese + '-investito'}
                    cx={cx}
                    cy={cy}
                    r={isSelected ? 6 : 3}
                    fill={isSelected ? '#0ea5e9' : '#fff'}
                    stroke="#0ea5e9"
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
  );
}
