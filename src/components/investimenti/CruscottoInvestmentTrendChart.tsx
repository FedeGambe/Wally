import React, { useState } from 'react';
import { Activity, BarChart3, TrendingUp } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import { toMeseCompatto } from '../../utils/date';
import { useIsMobile } from '../../hooks/useIsMobile';
import { formatAxisCompact } from '../../utils/format';

// Estratto da CruscottoGenerale.tsx: la card "Andamento Investimenti", con
// switch Cumulato/Mensile e Storico/Ultimi 12 mesi. Layout ricalcato 1:1 da
// Rendimenti.tsx (widget "Andamento Rendimenti").
//
// `timeRange`/`setTimeRange` restano prop (non stato locale): `chartData` è
// già calcolato dal genitore (useInvestimentiData) IN BASE a `timeRange`
// (vista "storico" vs "12 mesi" per il grafico Cumulato) — se diventasse
// stato locale qui, i bottoni Storico/12 Mesi smetterebbero di rifiltrare
// chartData, perché il genitore non saprebbe mai che è cambiato.
interface CruscottoInvestmentTrendChartProps {
  chartData: any[];
  localRendimenti: any[];
  timeRange: 'storico' | '12mesi';
  setTimeRange: (range: 'storico' | '12mesi') => void;
  formatEuro: (val: any) => string;
}

export default function CruscottoInvestmentTrendChart({
  chartData,
  localRendimenti,
  timeRange,
  setTimeRange,
  formatEuro
}: CruscottoInvestmentTrendChartProps) {
  const isMobile = useIsMobile();
  const [chartView, setChartView] = useState<'cumulato' | 'mensile'>('cumulato');

  // Per l'investimento mensile il versamento è noto subito (a differenza della
  // valutazione di portafoglio, disponibile solo a fine mese): includiamo quindi
  // anche il mese corrente se il bonifico risulta già registrato, invece di
  // fermarci al penultimo mese come fa la vista "cumulato".
  const activeRendimentiMensili = localRendimenti.filter(
    (r: any) => r && typeof r.importoMensileInvestito === 'number' && r.importoMensileInvestito > 0
  );
  const chartDataMensile = timeRange === '12mesi' ? activeRendimentiMensili.slice(-12) : activeRendimentiMensili;
  const activeChartData = chartView === 'mensile' ? chartDataMensile : chartData;
  // Massimo assoluto delle serie effettivamente disegnate: decide se l'asse Y può
  // usare la notazione compatta "k" (vedi formatAxisCompact in utils/format.ts).
  const yAxisMaxAbs = activeChartData.reduce((max: number, row: any) => {
    const keys = chartView === 'mensile' ? ['importoMensileInvestito'] : ['importoInvestitoCumulato', 'valoreAttualePortafoglio'];
    return keys.reduce((m, k) => Math.max(m, Math.abs(Number(row[k]) || 0)), max);
  }, 0);

  return (
    <div className="bg-white dark:bg-[#0c1425]/45 p-6 rounded-3xl border border-hairline dark:border-slate-800/80 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-1">
        <h3 className="font-bold text-ink dark:text-slate-100 font-display text-base flex items-center gap-1.5">
          <Activity className="w-5 h-5 text-sky-600 dark:text-sky-400" />
          Andamento Investimenti
        </h3>
        <div className="flex bg-canvas dark:bg-slate-800/60 p-1 rounded-xl gap-0.5 border border-hairline dark:border-slate-700/60 select-none">
          <button
            onClick={() => { setChartView('cumulato'); setTimeRange('storico'); }}
            className={`flex items-center gap-1 text-3xs px-3 py-1.5 font-extrabold rounded-lg transition-all cursor-pointer ${chartView === 'cumulato' ? 'bg-sky-700 text-white shadow-sm' : 'text-ink-soft dark:text-slate-400 hover:text-sky-700'
              }`}
          >
            Cumulato
          </button>
          <button
            onClick={() => { setChartView('mensile'); setTimeRange('12mesi'); }}
            className={`flex items-center gap-1 text-3xs px-3 py-1.5 font-extrabold rounded-lg transition-all cursor-pointer ${chartView === 'mensile' ? 'bg-sky-700 text-white shadow-sm' : 'text-ink-soft dark:text-slate-400 hover:text-sky-700'
              }`}
          >
            Mensile
          </button>
        </div>
      </div>
      <p className="text-xs text-ink-soft dark:text-slate-500 mb-4 font-medium">
        Andamento del portafoglio nel tempo, {chartView === 'mensile' ? 'importo versato ogni mese' : 'capitale investito confrontato con il valore di mercato'}.
      </p>

      <div className="flex flex-col h-[440px] p-4 rounded-2xl bg-canvas/60 dark:bg-slate-900/20 border border-hairline/70 dark:border-slate-800/60">
        <div className="flex items-center justify-between gap-3 mb-2">
          <h4 className="font-bold text-ink dark:text-slate-200 text-sm flex items-center gap-1.5">
            {chartView === 'mensile' ? <BarChart3 className="w-4 h-4 text-sky-600 dark:text-sky-400" /> : <TrendingUp className="w-4 h-4 text-sky-600 dark:text-sky-400" />}
            {chartView === 'mensile' ? 'Investimento Mensile' : 'Investimento Cumulato'}
          </h4>
          <div className="flex bg-white dark:bg-slate-800/60 p-1 rounded-xl gap-0.5 border border-hairline dark:border-slate-700/60 select-none">
            <button
              onClick={() => setTimeRange('storico')}
              className={`flex-1 text-center whitespace-nowrap text-3xs px-2.5 py-1.5 font-extrabold rounded-lg transition-all cursor-pointer ${timeRange === 'storico' ? 'bg-sky-600 text-white shadow-xs' : 'text-ink-soft dark:text-slate-400 hover:text-sky-600'
                }`}
            >
              Storico
            </button>
            <button
              onClick={() => setTimeRange('12mesi')}
              className={`flex-1 text-center whitespace-nowrap text-3xs px-2.5 py-1.5 font-extrabold rounded-lg transition-all cursor-pointer ${timeRange === '12mesi' ? 'bg-sky-600 text-white shadow-xs' : 'text-ink-soft dark:text-slate-400 hover:text-sky-600'
                }`}
            >
              <span className="sm:hidden">Ultimi 12 M.</span>
              <span className="hidden sm:inline">Ultimi 12 Mesi</span>
            </button>
          </div>
        </div>
        <p className="text-2xs text-ink-soft dark:text-slate-500 mb-2 font-medium">
          {chartView === 'mensile'
            ? 'Importo versato mese per mese sui conti di investimento.'
            : "Confronto storico tra il capitale depositato e l'attuale valore di mercato."}
        </p>
        <div className="flex justify-between items-center mb-3">
          <span className="text-3xs uppercase font-extrabold text-ink-soft tracking-wider">
            {timeRange === '12mesi' ? 'Focus Periodo (Ultimi 12 Mesi)' : 'Storico Completo'}
          </span>
          <span className="text-3xs text-ink-soft">
            {activeChartData.length > 0 ? `${activeChartData[0]?.mese} - ${activeChartData[activeChartData.length - 1]?.mese}` : ''}
          </span>
        </div>
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={activeChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorInvestitoValore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.01} />
                </linearGradient>
                <linearGradient id="colorValorePortafoglio" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.01} />
                </linearGradient>
                <linearGradient id="colorInvestitoMensile" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="strokeInvestitoMensile" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#075985" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="mese" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
              <YAxis
                stroke="#94a3b8"
                fontSize={9}
                tickLine={false}
                axisLine={false}
                width={isMobile ? 42 : 60}
                tickFormatter={(val) => isMobile
                  ? formatAxisCompact(val, yAxisMaxAbs)
                  : `€${Number(val).toLocaleString('it-IT')}`}
              />
              <Tooltip
                formatter={(value: any) => formatEuro(value)}
                contentStyle={{
                  background: '#1e293b',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '11px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                }}
                itemStyle={{ color: '#fff' }}
                labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
              />
              {chartView === 'mensile' ? (
                <Area
                  type="monotone"
                  name="Investimento Mensile"
                  dataKey="importoMensileInvestito"
                  stroke="url(#strokeInvestitoMensile)"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorInvestitoMensile)"
                  dot={false}
                  activeDot={{ r: 6 }}
                />
              ) : (
                <>
                  <Area
                    type="monotone"
                    name="Capitale Investito"
                    dataKey="importoInvestitoCumulato"
                    stroke="#64748b"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorInvestitoValore)"
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                  <Area
                    type="monotone"
                    name="Valore Portafoglio"
                    dataKey="valoreAttualePortafoglio"
                    stroke="#38bdf8"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorValorePortafoglio)"
                    dot={false}
                    activeDot={{ r: 6 }}
                  />
                </>
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 pt-3 border-t border-hairline dark:border-slate-800 text-xs font-semibold text-ink-soft flex justify-between items-center shrink-0">
          <div>
            <span className="block text-3xs uppercase text-ink-soft font-bold">Inizio Range</span>
            <span className="text-ink dark:text-slate-100 font-bold font-mono">
              <span className="sm:hidden">{activeChartData[0]?.mese ? toMeseCompatto(activeChartData[0].mese) : 'N/D'}</span>
              <span className="hidden sm:inline">{activeChartData[0]?.mese || 'N/D'}</span>
            </span>
          </div>
          <div className="text-right">
            <span className="block text-3xs uppercase text-ink-soft font-bold">Fine Range</span>
            <span className="font-bold font-mono text-ink dark:text-slate-100">
              <span className="sm:hidden">{activeChartData[activeChartData.length - 1]?.mese ? toMeseCompatto(activeChartData[activeChartData.length - 1].mese) : 'N/D'}</span>
              <span className="hidden sm:inline">{activeChartData[activeChartData.length - 1]?.mese || 'N/D'}</span> (
              <span className="text-sky-600 dark:text-sky-400">
                {formatEuro(chartView === 'mensile'
                  ? activeChartData[activeChartData.length - 1]?.importoMensileInvestito || 0
                  : activeChartData[activeChartData.length - 1]?.valoreAttualePortafoglio || 0)}
              </span>
              )
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
