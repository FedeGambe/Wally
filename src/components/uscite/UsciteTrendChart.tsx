import React, { useState } from 'react';
import { ZoomIn, ZoomOut } from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { useIsMobile } from '../../hooks/useIsMobile';
import { formatAxisCompact, formatEuro } from '../../utils/format';

// Estratto da Uscite.tsx: il grafico ad area con lo storico spese ultimi 12
// mesi (primarie/secondarie), filtrabile e cliccabile per cambiare il mese
// selezionato nel resto della pagina.

interface RollingMonthDatum {
  mese: string;
  anno: number;
  spesePrimarie: number;
  speseSecondarie: number;
  [key: string]: any;
}

interface UsciteTrendChartProps {
  rolling12MonthsData: RollingMonthDatum[];
  activeChartFilter: string;
  localSelectedMonth: string;
  handleChartClick: (event: any) => void;
}

const renderAreaLegend = ({ payload }: any) => (
  <div className="flex items-center justify-center gap-4" style={{ marginBottom: 12 }}>
    {payload.map((entry: any, idx: number) => (
      <span key={idx} className="flex items-center gap-1.5 text-ink-soft" style={{ fontSize: 11, fontWeight: 600 }}>
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
        {entry.value}
      </span>
    ))}
  </div>
);

export default function UsciteTrendChart({
  rolling12MonthsData,
  activeChartFilter,
  localSelectedMonth,
  handleChartClick
}: UsciteTrendChartProps) {
  const isMobile = useIsMobile();
  const [zoomedOut, setZoomedOut] = useState(false);

  // Massimo assoluto delle serie effettivamente disegnate (dipende dal filtro
  // primarie/secondarie/all): decide se l'asse Y può usare la notazione compatta
  // "k" su mobile (vedi formatAxisCompact in utils/format.ts).
  const yAxisMaxAbs = rolling12MonthsData.reduce((m: number, r) => {
    const keys = activeChartFilter === 'all' ? ['spesePrimarie', 'speseSecondarie']
      : activeChartFilter === 'primarie' ? ['spesePrimarie'] : ['speseSecondarie'];
    return keys.reduce((mm, k) => Math.max(mm, Math.abs(Number(r[k]) || 0)), m);
  }, 0);

  // Asse Y "zoomato": massimo = media della somma mensile delle serie visibili + un margine,
  // così un mese anomalo (outlier) non schiaccia gli altri. Il bottone "Zoom out" torna alla
  // scala automatica per vedere anche i valori molto alti.
  const visibleKeys = activeChartFilter === 'all' ? ['spesePrimarie', 'speseSecondarie']
    : activeChartFilter === 'primarie' ? ['spesePrimarie'] : ['speseSecondarie'];
  const monthlySums = rolling12MonthsData.map(r => visibleKeys.reduce((t, k) => t + (Number(r[k]) || 0), 0));
  const avgMonthly = monthlySums.length ? monthlySums.reduce((a, b) => a + b, 0) / monthlySums.length : 0;
  const Y_GAP = 1.25; // margine sopra la media (+25%)
  const zoomedMax = Math.max(100, Math.ceil((avgMonthly * Y_GAP) / 100) * 100);
  const hasOutliers = yAxisMaxAbs > zoomedMax;
  const clipY = hasOutliers && !zoomedOut;

  // Tooltip custom: Recharts passa "label" = valore dell'asse X (il mese), qui
  // lo cerchiamo in rolling12MonthsData per recuperare anche l'anno da mostrare.
  const renderAreaTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    const match = rolling12MonthsData.find(d => d.mese === label);
    const headerLabel = match ? `${label} ${match.anno}` : label;
    return (
      <div
        style={{
          background: '#1e293b',
          border: 'none',
          borderRadius: '12px',
          color: '#fff',
          fontSize: '12px',
          padding: '8px 12px'
        }}
      >
        <div className="font-bold" style={{ marginBottom: 4 }}>{headerLabel}</div>
        {payload.map((p: any, idx: number) => (
          <div key={idx} className="flex items-center gap-1.5" style={{ marginTop: idx > 0 ? 4 : 0 }}>
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
            <span>{p.name}: {formatEuro(Number(p.value))}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="relative h-72 mt-6 pointer-events-none md:pointer-events-auto">
      {hasOutliers && (
        <button
          onClick={() => setZoomedOut(z => !z)}
          className="absolute top-0 right-0 z-10 pointer-events-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-50 hover:bg-orange-100 text-orange-700 text-3xs font-bold transition cursor-pointer"
          title={zoomedOut ? 'Torna alla scala sulla media' : 'Mostra anche i valori molto alti'}
        >
          {zoomedOut ? <ZoomIn className="w-3 h-3" /> : <ZoomOut className="w-3 h-3" />}
          {zoomedOut ? 'Zoom in' : 'Zoom out'}
        </button>
      )}
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={rolling12MonthsData}
          margin={{ top: 15, right: 15, left: isMobile ? 0 : 10, bottom: 0 }}
          onClick={handleChartClick}
        >
          <defs>
            <linearGradient id="colorUscitePrimarie" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#c2410c" stopOpacity={0.25}/>
              <stop offset="95%" stopColor="#c2410c" stopOpacity={0.01}/>
            </linearGradient>
            <linearGradient id="colorUsciteSecondarie" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#fb923c" stopOpacity={0.2}/>
              <stop offset="95%" stopColor="#fb923c" stopOpacity={0.01}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis
            dataKey="mese"
            stroke="#94a3b8"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            interval={isMobile ? 2 : 0}
            tickFormatter={(val) => {
              const match = rolling12MonthsData.find(d => d.mese === val);
              return match ? `${val} '${String(match.anno).slice(2)}` : val;
            }}
          />
          <YAxis
            stroke="#94a3b8"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            width={isMobile ? 44 : 60}
            domain={clipY ? [0, zoomedMax] : [0, 'auto']}
            allowDataOverflow={clipY}
            tickFormatter={(val) => isMobile
              ? formatAxisCompact(val, yAxisMaxAbs)
              : `€${Number(val).toLocaleString('it-IT', { useGrouping: true })}`}
          />
          <Tooltip content={renderAreaTooltip} />
          <Legend verticalAlign="top" height={36} content={renderAreaLegend} />
          {(activeChartFilter === 'all' || activeChartFilter === 'primarie') && (
            <Area
              type="monotone"
              dataKey="spesePrimarie"
              name="Spese Primarie"
              stroke="#c2410c"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorUscitePrimarie)"
              dot={(props: any) => {
                const { cx, cy, payload } = props;
                const isSelected = payload.mese.toLowerCase() === localSelectedMonth.toLowerCase();
                return (
                  <circle
                    key={payload.mese + '-primary'}
                    cx={cx}
                    cy={cy}
                    r={isSelected ? 6 : 4}
                    fill={isSelected ? '#c2410c' : '#fff'}
                    stroke="#c2410c"
                    strokeWidth={isSelected ? 3 : 2}
                    className="cursor-pointer transition-all"
                  />
                );
              }}
            />
          )}
          {(activeChartFilter === 'all' || activeChartFilter === 'secondarie') && (
            <Area
              type="monotone"
              dataKey="speseSecondarie"
              name="Spese Secondarie"
              stroke="#fb923c"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorUsciteSecondarie)"
              dot={(props: any) => {
                const { cx, cy, payload } = props;
                const isSelected = payload.mese.toLowerCase() === localSelectedMonth.toLowerCase();
                return (
                  <circle
                    key={payload.mese + '-secondary'}
                    cx={cx}
                    cy={cy}
                    r={isSelected ? 6 : 4}
                    fill={isSelected ? '#fb923c' : '#fff'}
                    stroke="#fb923c"
                    strokeWidth={isSelected ? 3 : 2}
                    className="cursor-pointer transition-all"
                  />
                );
              }}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
