import React from 'react';
import {
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis
} from 'recharts';
import {
  ArrowUpRight,
  TrendingUp,
  Calendar,
  Grid,
  CreditCard
} from 'lucide-react';
import Drawer from '../components/Drawer';
import { formatEuro, formatPercent } from '../utils/format';
import { useEntrateData } from '../hooks/useEntrateData';

interface EntrateProps {
  selectedYear: string;
  setSelectedYear: (year: string) => void;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
}

export default function Entrate({
  selectedYear,
  setSelectedYear,
  selectedMonth,
  setSelectedMonth
}: EntrateProps) {
  const {
    localSelectedMonth,
    drawerOpen, setDrawerOpen,
    drawerTitle, drawerTransactions, drawerStats,
    COLORS,
    chartData,
    selectedRecord, prevRecord,
    totalIncomeForSelectedYear, avgMonthlyIncome,
    categoryData, accountData,
    activeMonthEntries,
    handlePointClick
  } = useEntrateData(selectedYear, setSelectedYear, selectedMonth, setSelectedMonth);

  const renderDelta = (current: number, previous?: number) => {
    if (previous === undefined || previous === 0) return null;
    const isPreviousHigher = previous > current;
    const percentDiff = Math.abs(((current - previous) / previous) * 100);
    const formattedPct = formatPercent(percentDiff);

    if (isPreviousHigher) {
      return (
        <span className="inline-flex items-center gap-0.5 text-[11px] font-extrabold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-md ml-1.5 shrink-0 align-middle">
          <span>↓ {formattedPct}</span>
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-0.5 text-[11px] font-extrabold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md ml-1.5 shrink-0 align-middle">
          <span>↑ {formattedPct}</span>
        </span>
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Bento box contatori */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Box Entrate Mensili */}
        <div className="bg-emerald-700 text-white rounded-3xl p-6 flex flex-col justify-between shadow-lg relative overflow-hidden h-40 border border-emerald-800 transition-all duration-300 hover:shadow-xl hover:scale-[1.01]">
          <div className="absolute right-4 top-4 w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-emerald-100 backdrop-blur-xs">
            <ArrowUpRight className="w-6 h-6" />
          </div>
          <div className="z-10 text-left">
            <span className="text-xs text-emerald-200 font-bold uppercase tracking-wider block">
              Entrate Mensili ({selectedRecord?.meseDisplay} {selectedRecord?.anno})
            </span>
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <h3 className="text-3xl font-extrabold font-display text-white leading-none">
                {formatEuro(selectedRecord?.entrate || 0)}
              </h3>
              {renderDelta(selectedRecord?.entrate || 0, prevRecord?.entrate)}
            </div>
          </div>
          <p className="text-xs text-emerald-100/95 mt-auto z-10 font-medium text-left">
            Totale flussi reali accreditati nel mese selezionato
          </p>
          <div className="absolute -right-4 -bottom-4 opacity-10">
            <ArrowUpRight className="w-32 h-32" />
          </div>
        </div>

        {/* Box Entrate Annuali */}
        <div className="bg-indigo-900 text-white rounded-3xl p-6 flex flex-col justify-between shadow-lg relative overflow-hidden h-40 border border-indigo-950 transition-all duration-300 hover:shadow-xl hover:scale-[1.01]">
          <div className="absolute right-4 top-4 w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-indigo-100 backdrop-blur-xs">
            <Calendar className="w-6 h-6" />
          </div>
          <div className="z-10 text-left">
            <span className="text-xs text-indigo-200 font-bold uppercase tracking-wider block">
              Entrate Anno Corrente ({selectedRecord?.anno})
            </span>
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <h3 className="text-3xl font-extrabold font-display text-white leading-none">
                {formatEuro(totalIncomeForSelectedYear)}
              </h3>
            </div>
          </div>
          <p className="text-xs text-indigo-100/95 mt-auto z-10 font-medium text-left">
            Media mensile stimata di <strong className="font-bold">{formatEuro(avgMonthlyIncome)}</strong>
          </p>
          <div className="absolute -right-4 -bottom-4 opacity-10">
            <TrendingUp className="w-32 h-32" />
          </div>
        </div>
      </div>

      {/* Grafico Principale di Andamento Storico */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm text-left transition-all duration-300 hover:shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="font-bold text-slate-800 font-display text-base">Andamento Entrate Mensili</h3>
            <p className="text-xs text-slate-400 mt-1">
              Visualizzazione dei flussi di entrata storici estratti da Google Fogli. Clicca sul punto del mese per visualizzare il dettaglio dei bonifici.
            </p>
          </div>
          <div className="bg-emerald-50 px-3 py-1.5 rounded-full text-xs font-bold text-emerald-700 self-start sm:self-center capitalize">
            Attivo: {localSelectedMonth} {selectedRecord?.anno}
          </div>
        </div>

        <div className="h-72 mt-6">
          {chartData.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-400">
              <Calendar className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-xs">Nessun dato cronologico disponibile per l'anno selezionato</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 15, right: 15, left: 10, bottom: 0 }}
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
                  interval={0}
                  tickFormatter={(val) => {
                    const parts = String(val).split(' ');
                    if (parts.length === 2) {
                      return `${parts[0].slice(0, 3)} '${parts[1].slice(2)}`;
                    }
                    return val;
                  }}
                />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `€${Number(val).toLocaleString('it-IT', { useGrouping: true })}`} />
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

      {/* Grafici a Torta della Ripartizione */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Torta Categorie */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm text-left transition-all duration-300 hover:shadow-md">
          <h3 className="font-bold text-slate-800 font-display text-base flex items-center gap-2">
            <Grid className="w-5 h-5 text-emerald-600" />
            Ripartizione Categoria Ricavi
          </h3>
          <p className="text-xs text-slate-400 mt-1">Suddivisione delle entrate per causale o tipologia</p>
          
          <div className="flex flex-col sm:flex-row items-center justify-around gap-6 mt-6">
            {categoryData.length === 0 ? (
              <div className="h-44 w-full flex flex-col items-center justify-center text-center text-slate-400">
                <Grid className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-xs">Nessuna entrata registrata per questo mese</p>
              </div>
            ) : (
              <>
                <div className="h-44 w-44 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={0}
                        stroke="none"
                        dataKey="value"
                        isAnimationActive={false}
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => formatEuro(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="space-y-2.5 text-xs w-full max-w-xs">
                  {categoryData.map((c, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                        <span className="text-slate-600 font-semibold truncate">{c.name}</span>
                      </div>
                      <span className="font-bold text-slate-800">{formatEuro(c.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Torta Canali / Conti di accredito */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm text-left transition-all duration-300 hover:shadow-md">
          <h3 className="font-bold text-slate-800 font-display text-base flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-600" />
            Canali di Accredito
          </h3>
          <p className="text-xs text-slate-400 mt-1">Conti correnti e depositi su cui sono confluiti i capitali</p>
          
          <div className="flex flex-col sm:flex-row items-center justify-around gap-6 mt-6">
            {accountData.length === 0 ? (
              <div className="h-44 w-full flex flex-col items-center justify-center text-center text-slate-400">
                <CreditCard className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-xs">Nessun accredito registrato per questo mese</p>
              </div>
            ) : (
              <>
                <div className="h-44 w-44 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={accountData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={0}
                        stroke="none"
                        dataKey="value"
                        isAnimationActive={false}
                      >
                        {accountData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => formatEuro(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="space-y-2.5 text-xs w-full max-w-xs">
                  {accountData.map((a, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[(idx + 2) % COLORS.length] }} />
                        <span className="text-slate-600 font-semibold truncate">{a.name}</span>
                      </div>
                       <span className="font-bold text-slate-800">{formatEuro(a.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabella Dettaglio Entrate del Mese */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm text-left transition-all duration-300 hover:shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h3 className="font-bold text-slate-800 font-display text-base">
              Movimenti Entrate - {selectedRecord?.meseDisplay} {selectedRecord?.anno}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Lista dei singoli flussi reali registrati per questo mese nel foglio Entrate.
            </p>
          </div>
          <div className="bg-slate-50 px-3 py-1 text-xs font-mono font-bold text-slate-600 rounded-lg">
            {activeMonthEntries.length} {activeMonthEntries.length === 1 ? 'movimento' : 'movimenti'}
          </div>
        </div>

        {activeMonthEntries.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
            Nessun movimento di entrata inserito direttamente per questo mese.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Categoria / Causale</th>
                  <th className="py-3 px-4">Canale / Conto</th>
                  <th className="py-3 px-4">Note / Dettagli</th>
                  <th className="py-3 px-4 text-right">Importo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs">
                {activeMonthEntries.map((e, idx) => (
                  <tr key={e.id || idx} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        <span>{e.categoria || 'Generica'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded text-[10px] text-slate-600 font-mono">
                        {e.conto || 'Altro'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 font-normal">
                      {e.dettagli || '-'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-emerald-600 font-mono">
                      {formatEuro(e.importo)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={drawerTitle}
        transactions={drawerTransactions}
        stats={drawerStats}
      />
    </div>
  );
}