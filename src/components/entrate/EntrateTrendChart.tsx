import React from 'react';
import { Calendar } from 'lucide-react';
import {
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis
} from 'recharts';
import { formatEuro, formatAxisCompact } from '../../utils/format';

interface EntrateTrendChartProps {
  chartData: any[];
  isMobile: boolean;
  localSelectedMonth: string;
  selectedRecord: any;
  handlePointClick: (meseDisplay: string, anno: number, entrate: number) => void;
}

/**
 * Grafico "Andamento Entrate Mensili": area storica cliccabile (sia il
 * bottone "Vedi Transazioni" che i singoli punti del grafico aprono il
 * drawer di dettaglio via handlePointClick).
 */
export default function EntrateTrendChart({ chartData, isMobile, localSelectedMonth, selectedRecord, handlePointClick }: EntrateTrendChartProps) {
  // Massimo assoluto della serie disegnata: decide se l'asse Y può usare la
  // notazione compatta "k" su mobile (vedi formatAxisCompact in utils/format.ts).
  const yAxisMaxAbs = chartData.reduce((m: number, r: any) => Math.max(m, Math.abs(Number(r.entrate) || 0)), 0);

  return (
    <div className="bg-white p-6 rounded-3xl border border-hairline shadow-sm text-left transition-all duration-300 hover:shadow-md">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="font-bold text-ink font-display text-base">Andamento Entrate Mensili</h3>
          <p className="text-xs text-ink-soft mt-1">
            Visualizzazione dei flussi di entrata storici estratti da Google Fogli. Clicca sul punto del mese per visualizzare il dettaglio dei bonifici.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline bg-emerald-50 px-3 py-1.5 rounded-full text-xs font-bold text-emerald-700 capitalize">
            Attivo: {localSelectedMonth} {selectedRecord?.anno}
          </span>
          <button
            onClick={() => handlePointClick(selectedRecord?.meseDisplay || localSelectedMonth, selectedRecord?.anno || new Date().getFullYear(), selectedRecord?.entrate || 0)}
            className="bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition hover:bg-emerald-800 cursor-pointer text-center"
          >
            Vedi Transazioni
          </button>
        </div>
      </div>

      <div className="h-72 mt-6 pointer-events-none md:pointer-events-auto">
        {chartData.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-ink-soft">
            <Calendar className="w-8 h-8 text-slate-300 mb-2" />
            <p className="text-xs">Nessun dato cronologico disponibile per l'anno selezionato</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 15, right: 15, left: isMobile ? 0 : 10, bottom: 0 }}
              onClick={(chartEvent: any) => {
                // Recharts v3 non passa più `activePayload` all'onClick: usiamo `activeLabel`
                // (qui: uniqueKey, già univoco mese+anno) per risalire al record cliccato.
                if (!chartEvent || !chartEvent.activeLabel) return;
                const matched = chartData.find(r => r.uniqueKey === chartEvent.activeLabel);
                if (matched) handlePointClick(matched.meseDisplay, matched.anno, matched.entrate);
              }}
            >
              <defs>
                <linearGradient id="colorEntrate" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="uniqueKey"
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                interval={isMobile ? 2 : 0}
                tickFormatter={(val) => {
                  const parts = String(val).split(' ');
                  if (parts.length === 2) {
                    return `${parts[0].slice(0, 3)} '${parts[1].slice(2)}`;
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
                tickFormatter={(val) => isMobile
                  ? formatAxisCompact(val, yAxisMaxAbs)
                  : `€${Number(val).toLocaleString('it-IT', { useGrouping: true })}`}
              />
              <Tooltip
                formatter={(value: any) => [formatEuro(value), 'Entrate']}
                contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
              />
              <Area
                type="monotone"
                dataKey="entrate"
                stroke="#10b981"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorEntrate)"
                dot={(props: any) => {
                  const { cx, cy, payload } = props;
                  const isSelected = payload.meseDisplay.toLowerCase() === localSelectedMonth.toLowerCase();
                  return (
                    <circle
                      key={payload.uniqueKey}
                      cx={cx}
                      cy={cy}
                      r={isSelected ? 6 : 4}
                      fill={isSelected ? '#10b981' : '#fff'}
                      stroke="#10b981"
                      strokeWidth={isSelected ? 3 : 2}
                      className="cursor-pointer transition-all"
                    />
                  );
                }}
                activeDot={{ r: 8 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
