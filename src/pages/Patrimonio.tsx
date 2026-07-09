import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Coins,
  ShieldAlert,
  AlertTriangle,
  TrendingUp,
  Info,
  PiggyBank,
  BarChart3,
  Wallet
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import FinanceKpiCard from '../components/FinanceKpiCard';
import { formatEuro, formatPercent } from '../utils/format';
import { usePatrimonioData } from '../hooks/usePatrimonioData';

export default function Patrimonio() {
  const {
    selectedConto, setSelectedConto,
    visibleLines, setVisibleLines,
    localConti,
    totalWealth, totalDisponibile, totalInvestito, totalImpegnato,
    engagedCapitalData,
    COLORS,
    sortedRisparmio,
    cumulativeRisparmioData
  } = usePatrimonioData();

  // Le voci "Stima" (linee tratteggiate) compaiono in tooltip solo per il mese effettivamente mancante,
  // non nel punto di raccordo dove duplicano il valore reale già mostrato dalla linea piena.
  const renderAndamentoTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    const rowData = payload[0].payload;
    const meseMancante = rowData.investito === undefined || rowData.investito === null;
    const visible = payload.filter((p: any) => {
      if (p.value === undefined || p.value === null) return false;
      const isStima = typeof p.dataKey === 'string' && p.dataKey.includes('Stima');
      return isStima ? meseMancante : true;
    });
    if (visible.length === 0) return null;
    return (
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(30,41,59,0.92), rgba(15,23,42,0.96))',
          backdropFilter: 'blur(4px)',
          border: 'none',
          borderRadius: '12px',
          color: '#fff',
          fontSize: '12px',
          padding: '8px 12px'
        }}
      >
        {visible.map((p: any, idx: number) => (
          <div key={idx} className="flex items-center gap-1.5" style={{ marginTop: idx > 0 ? 4 : 0 }}>
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
            <span>{p.name}: {formatEuro(Number(p.value))}</span>
          </div>
        ))}
      </div>
    );
  };

  const splitCapitalData = [
    { name: 'Disponibile', value: totalDisponibile, color: '#10b981' },
    { name: 'Investito', value: totalInvestito, color: '#0ea5e9' },
    { name: 'Accantonato', value: totalImpegnato, color: '#f59e0b' }
  ].filter(item => item.value > 0);

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        {/* Wealth card 1 - Capitale Totale (Slate-900) */}
        <FinanceKpiCard
          id="card-patrimonio"
          type="totale"
          title="Capitale Totale"
          value={totalDisponibile + totalInvestito}
          icon={BarChart3}
          detail={
            <>
              <span className="w-2 h-2 rounded-full bg-slate-400 animate-pulse"></span>
              <span>Incluso Accantonamento: <strong className="text-xs sm:text-[13px] font-black font-mono text-slate-800 dark:text-slate-100 tracking-tight ml-1">{formatEuro(totalDisponibile + totalInvestito + totalImpegnato)}</strong></span>
            </>
          }
        />

        {/* Wealth card 2 - Capitale Disponibile (Indigo) */}
        <FinanceKpiCard
          id="card-liquido"
          type="disponibile"
          title="Capitale Disponibile"
          value={totalDisponibile}
          icon={PiggyBank}
          detail={
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Liquidità immediata sui conti ({formatPercent(totalWealth > 0 ? (totalDisponibile / totalWealth) * 100 : 0)})</span>
            </>
          }
        />

        {/* Wealth card 3 - Capitale Investito (Emerald) */}
        <FinanceKpiCard
          id="card-investito"
          type="investito"
          title="Capitale Investito"
          value={totalInvestito}
          icon={TrendingUp}
          detail={
            <>
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse"></span>
              <span>Strumenti finanziari attivi ({formatPercent(totalWealth > 0 ? (totalInvestito / totalWealth) * 100 : 0)})</span>
            </>
          }
        />

        {/* Wealth card 4 - Capitale Accantonato (Amber) */}
        <FinanceKpiCard
          id="card-impegnato"
          type="impegnato"
          title="Capitale Accantonato"
          value={totalImpegnato}
          icon={Coins}
          detail={
            <>
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              <span>Fondi vincolati o prenotati ({formatPercent(totalWealth > 0 ? (totalImpegnato / totalWealth) * 100 : 0)})</span>
            </>
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[65%_35%] gap-6">
        {/* Accounts Summary Cards List (Left, 65% width) */}
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm text-left transition-all duration-300 hover:shadow-md">
            <h3 className="font-bold text-slate-800 font-display text-base mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span>Sintesi Situazione Conti</span>
              <span className="text-[10px] text-slate-400 font-semibold font-mono">Soglia critica di allerta: {formatEuro(5000)}</span>
            </h3>

            <div className="space-y-3">
              {localConti.map((conto, index) => {
                const isUnderThreshold = conto.capitaleTotale < conto.sogliaAllarme;
                const limitRemaining = conto.sogliaAllarme - conto.capitaleTotale;
                const isSelected = selectedConto
                  ? (conto.id && selectedConto.id === conto.id) || selectedConto.categoria === conto.categoria
                  : false;

                const hasSoglia =
                  conto.allarmeSoglia !== undefined &&
                  conto.allarmeSoglia !== null &&
                  !isNaN(conto.allarmeSoglia) &&
                  conto.rimanenteSoglia !== undefined &&
                  conto.rimanenteSoglia !== null &&
                  !isNaN(conto.rimanenteSoglia) &&
                  !(Number(conto.allarmeSoglia) === 0 && Number(conto.rimanenteSoglia) === 0);

                return (
                  <React.Fragment key={conto.id || conto.categoria || index}>
                    <div
                      id={`conto-row-${conto.id || index}`}
                      onClick={() => setSelectedConto(isSelected ? null : conto)}
                      className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${isSelected
                        ? 'conto-row-selezionato border-amber-500 bg-amber-50/25'
                        : 'border-slate-100 hover:border-slate-200 bg-white'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${hasSoglia
                          ? (conto.allarmeSoglia! > 100
                            ? 'bg-rose-50 text-rose-500'
                            : conto.allarmeSoglia! > 85
                              ? 'bg-amber-50 text-amber-500'
                              : 'bg-emerald-50 text-emerald-500')
                          : (isUnderThreshold ? 'bg-amber-50 text-amber-500' : 'bg-slate-50 text-slate-600')
                          }`}>
                          {hasSoglia && conto.allarmeSoglia! > 100 ? (
                            <AlertTriangle className="w-5 h-5 text-rose-500" />
                          ) : (isUnderThreshold || (hasSoglia && conto.allarmeSoglia! > 85)) ? (
                            <AlertTriangle className="w-5 h-5 text-amber-500" />
                          ) : (
                            <Coins className="w-5 h-5" />
                          )}
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-semibold text-slate-800">{conto.categoria}</p>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-[11px] text-slate-400 font-medium">
                            <span>Disponibile: <strong className="text-slate-600">{formatEuro(conto.capitaleDisponibile)}</strong></span>
                            {conto.capitaleInvestito > 0 && (
                              <>
                                <span>•</span>
                                <span>Investito: <strong className="text-slate-600">{formatEuro(conto.capitaleInvestito)}</strong></span>
                              </>
                            )}
                            {conto.capitaleImpegnato > 0 && (
                              <>
                                <span>•</span>
                                <span>Vincolato: <strong className="text-slate-600">{formatEuro(conto.capitaleImpegnato)}</strong></span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4 border-t border-slate-50 pt-2.5 sm:border-t-0 sm:pt-0">
                        {/* Threshold warnings alerts */}
                        {hasSoglia ? (
                          <div className="flex items-center shrink-0">
                            {conto.allarmeSoglia! > 100 ? (
                              <span className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-600 border border-rose-200 text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wide">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                                Fuori Soglia
                              </span>
                            ) : conto.allarmeSoglia! > 85 ? (
                              <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-600 border border-amber-200 text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wide">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                Attenzione
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-600 border border-emerald-200 text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wide">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                Sotto Soglia
                              </span>
                            )}
                          </div>
                        ) : (
                          isUnderThreshold && (
                            <div className="text-right">
                              <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-600 text-[9px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wide">
                                <ShieldAlert className="w-3.5 h-3.5" />
                                Sotto Soglia
                              </span>
                              <p className="text-[9px] text-slate-400 font-mono mt-0.5">Mancano {formatEuro(limitRemaining)}</p>
                            </div>
                          )
                        )}

                        <div className="text-right shrink-0">
                          <span className="text-slate-400 font-bold text-[9px] uppercase block">Capitale Totale</span>
                          <span className="text-sm font-bold text-slate-800 font-display block mt-0.5">
                            {formatEuro(conto.capitaleTotale)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Expandable account details inline directly below */}
                    <AnimatePresence initial={false}>
                      {isSelected && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="conto-panel-espanso p-5 mt-1 mb-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800">
                            <div className="flex justify-between items-center border-b border-slate-200 pb-3 mb-3">
                              <div>
                                <h4 className="font-bold font-display text-sm text-slate-800">{conto.categoria}</h4>
                                <p className="text-[10px] text-slate-500">Analisi approfondita disponibilità del conto</p>
                              </div>
                              <span className="text-[10px] bg-amber-50 text-amber-600 font-bold px-2.5 py-0.5 rounded-full border border-amber-200/60">
                                CONTO SELEZIONATO
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                              <div className="space-y-2.5">
                                <div className="flex justify-between border-b border-slate-100 pb-1.5">
                                  <span className="text-slate-500 font-medium">Saldo complessivo:</span>
                                  <span className="font-bold text-slate-800">{formatEuro(conto.capitaleTotale)}</span>
                                </div>
                                <div className="flex justify-between border-b border-slate-100 pb-1.5">
                                  <span className="text-slate-500 font-medium">Liquido disponibile:</span>
                                  <span className="font-bold text-emerald-600">{formatEuro(conto.capitaleDisponibile)}</span>
                                </div>
                                {hasSoglia && (
                                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                                    <span className="text-slate-500 font-medium">Allarme Soglia (%):</span>
                                    <span className={`font-bold ${conto.allarmeSoglia! > 100 ? 'text-rose-600' : conto.allarmeSoglia! > 85 ? 'text-amber-500' : 'text-emerald-600'}`}>
                                      {conto.allarmeSoglia}%
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div className="space-y-2.5">
                                <div className="flex justify-between border-b border-slate-100 pb-1.5">
                                  <span className="text-slate-500 font-medium">Quota investimenti:</span>
                                  <span className="font-bold text-sky-600">{formatEuro(conto.capitaleInvestito)}</span>
                                </div>
                                <div className="flex justify-between border-b border-slate-100 pb-1.5">
                                  <span className="text-slate-500 font-medium">Quota accantonamenti:</span>
                                  <span className="font-bold text-amber-600">{formatEuro(conto.capitaleImpegnato)}</span>
                                </div>
                                {hasSoglia && (
                                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                                    <span className="text-slate-500 font-medium">Rimanente Soglia:</span>
                                    <span className={`font-bold ${conto.allarmeSoglia !== undefined && conto.allarmeSoglia > 100 ? 'text-rose-600' : 'text-slate-700'}`}>
                                      {formatEuro(conto.rimanenteSoglia!)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="mt-4 pt-3.5 border-t border-slate-100 text-[10px] text-slate-500 flex items-center gap-1.5">
                              <Info className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                              <span>Valori storici e saldi sincronizzati in tempo reale dal foglio di calcolo Google Sheets.</span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>

        {/* Analytical Widgets Column (Right, 35% width) */}
        <div className="flex flex-col gap-6 h-full">
          {/* 0. Suddivisione Capitale (Disponibile / Investito / Accantonato) */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm text-left transition-all duration-300 hover:shadow-md flex flex-col flex-1 min-h-0">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-amber-500" />
              <div>
                <h3 className="font-bold text-slate-800 font-display text-base leading-snug">Suddivisione Capitale</h3>
                <p className="text-xs text-slate-400 mt-0.5">Ripartizione tra capitale disponibile, investito e accantonato</p>
              </div>
            </div>

            <div className="flex-1 min-h-0 mt-4 flex items-center gap-4">
              {splitCapitalData.length > 0 ? (
                <>
                  <div className="flex-1 h-full min-h-[120px] relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Tooltip wrapperStyle={{ zIndex: 50 }} formatter={(value: any, name: any) => [formatEuro(Number(value)), name]} />
                        <Pie
                          data={splitCapitalData}
                          cx="50%"
                          cy="50%"
                          innerRadius="55%"
                          outerRadius="85%"
                          paddingAngle={0}
                          stroke="none"
                          dataKey="value"
                        >
                          {splitCapitalData.map((entry, index) => (
                            <Cell key={`split-cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Totale</span>
                      <span className="text-sm font-black font-display text-amber-500">{formatEuro(totalDisponibile + totalInvestito + totalImpegnato)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0 max-w-[30%]">
                    {splitCapitalData.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-1.5">
                        <span className="w-2 h-2 rounded-full mt-1 shrink-0" style={{ backgroundColor: item.color }} />
                        <div className="min-w-0">
                          <span className="text-slate-600 font-medium text-[10px] block truncate">{item.name}</span>
                          <span className="font-bold text-slate-800 text-[11px] block">{formatEuro(item.value)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="w-full text-center text-xs text-slate-400 font-medium">
                  Nessun capitale presente nel foglio Google Sheets
                </div>
              )}
            </div>
          </div>

          {/* 1. Dedicated Capitale Impegnato Box Widget */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm text-left transition-all duration-300 hover:shadow-md flex flex-col flex-1 min-h-0">
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-amber-500" />
              <div>
                <h3 className="font-bold text-slate-800 font-display text-base leading-snug">Capitale Accantonato</h3>
                <p className="text-xs text-slate-400 mt-0.5">Suddivisione del capitale vincolato e dei debiti attivi per conto</p>
              </div>
            </div>

            <div className="flex-1 min-h-0 mt-4 flex items-center gap-4">
              {engagedCapitalData.length > 0 ? (
                <>
                  <div className="flex-1 h-full min-h-[120px] relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Tooltip wrapperStyle={{ zIndex: 50 }} formatter={(value: any, name: any) => [formatEuro(Number(value)), name]} />
                        <Pie
                          data={engagedCapitalData}
                          cx="50%"
                          cy="50%"
                          innerRadius="55%"
                          outerRadius="85%"
                          paddingAngle={0}
                          stroke="none"
                          dataKey="value"
                        >
                          {engagedCapitalData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Totale</span>
                      <span className="text-sm font-black font-display text-amber-500">{formatEuro(totalImpegnato)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0 max-w-[30%] max-h-full overflow-y-auto pr-1">
                    {engagedCapitalData.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-1.5">
                        <span className="w-2 h-2 rounded-full mt-1 shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                        <div className="min-w-0">
                          <span className="text-slate-600 font-medium text-[10px] block truncate" title={item.name}>{item.name}</span>
                          <span className="font-bold text-slate-800 text-[11px] block">{formatEuro(item.value)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="w-full text-center text-xs text-slate-400 font-medium">
                  Nessun capitale accantonato presente nel foglio Google Sheets
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* 2. Unified Dedicated Trend Card - 2/3 Area Chart with 3 Lines & 1/3 Monthly Summary */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm text-left transition-all duration-300 hover:shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-amber-500" />
            <div>
              <h3 className="font-bold text-slate-800 font-display text-base leading-snug">Andamento Finanziario</h3>
              <p className="text-xs text-slate-400 mt-0.5">Analisi storica e cumulativa del patrimonio netto</p>
            </div>
          </div>
          {/* Legend indicator */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setVisibleLines(prev => ({ ...prev, netto: !prev.netto }))}
              className={`flex items-center gap-2 transition-all duration-200 cursor-pointer select-none px-3 py-1.5 rounded-xl border text-xs font-semibold ${visibleLines.netto
                ? 'bg-slate-100 text-slate-800 border-slate-300 shadow-2xs'
                : 'bg-transparent text-slate-400 border-slate-200 hover:bg-slate-50 opacity-60'
                }`}
            >
              <span className={`w-2 h-2 rounded-full transition-all ${visibleLines.netto ? 'bg-slate-500' : 'bg-slate-300'}`}></span>
              <span>Netto</span>
            </button>
            <button
              onClick={() => setVisibleLines(prev => ({ ...prev, risparmio: !prev.risparmio }))}
              className={`flex items-center gap-2 transition-all duration-200 cursor-pointer select-none px-3 py-1.5 rounded-xl border text-xs font-semibold ${visibleLines.risparmio
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-2xs'
                : 'bg-transparent text-slate-400 border-slate-200 hover:bg-emerald-50/20 opacity-60'
                }`}
            >
              <span className={`w-2 h-2 rounded-full transition-all ${visibleLines.risparmio ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
              <span>Risparmio</span>
            </button>
            <button
              onClick={() => setVisibleLines(prev => ({ ...prev, investito: !prev.investito }))}
              className={`flex items-center gap-2 transition-all duration-200 cursor-pointer select-none px-3 py-1.5 rounded-xl border text-xs font-semibold ${visibleLines.investito
                ? 'bg-sky-50 text-sky-700 border-sky-200 shadow-2xs'
                : 'bg-transparent text-slate-400 border-slate-200 hover:bg-sky-50/20 opacity-60'
                }`}
            >
              <span className={`w-2 h-2 rounded-full transition-all ${visibleLines.investito ? 'bg-sky-500' : 'bg-slate-300'}`}></span>
              <span>Investito</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2/3 - Integrated Chart */}
          <div className="lg:col-span-2">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={cumulativeRisparmioData}
                  margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorNettoPatrimonio" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorRisparmioPatrimonio" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorInvestitoPatrimonio" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0284c7" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#0284c7" stopOpacity={0} />
                    </linearGradient>
                  </defs>

                  <Tooltip wrapperStyle={{ zIndex: 50 }} content={renderAndamentoTooltip} />

                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="uniqueKey"
                    stroke="#94a3b8"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    tickFormatter={(value) => {
                      const item = cumulativeRisparmioData.find(d => d.uniqueKey === value);
                      return item?.mese?.toLowerCase().includes("dic")
                        ? String(item.anno)
                        : "";
                    }}
                  />
                  <YAxis
                    yAxisId="left"
                    stroke="#64748b"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) =>
                      value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value
                    }
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="#64748b"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) =>
                      value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value
                    }
                  />

                  {/* Line 1: Andamento Netto (scala sinistra, grigia) */}
                  <Area
                    type="monotone"
                    yAxisId="left"
                    name="Andamento Netto"
                    dataKey="andamentoNetto"
                    stroke="#94a3b8"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorNettoPatrimonio)"
                    dot={false}
                    activeDot={false}
                    hide={!visibleLines.netto}
                  />

                  {/* Line 2: Andamento Risparmio (scala sinistra, verde) */}
                  <Area
                    type="monotone"
                    yAxisId="left"
                    name="Andamento Risparmio"
                    dataKey="risparmioCumulativo"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorRisparmioPatrimonio)"
                    dot={false}
                    activeDot={false}
                    hide={!visibleLines.risparmio}
                  />

                  {/* Line 3: Quota Investimenti (scala destra, blu/indigo) */}
                  <Area
                    type="monotone"
                    yAxisId="right"
                    name="Quota Investimenti"
                    dataKey="investito"
                    stroke="#0284c7"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorInvestitoPatrimonio)"
                    dot={false}
                    activeDot={false}
                    hide={!visibleLines.investito}
                  />

                  {/* Stima mese mancante Investito: scenario ottimistico e pessimistico (tratteggiate, stesso colore della linea Quota Investimenti) */}
                  <Area
                    type="monotone"
                    yAxisId="right"
                    name="Stima Investito (ottimistica)"
                    dataKey="investitoStimaOttimistica"
                    stroke="#0284c7"
                    strokeWidth={2}
                    strokeDasharray="2 2"
                    fill="url(#colorInvestitoPatrimonio)"
                    fillOpacity={1}
                    dot={false}
                    activeDot={false}
                    hide={!visibleLines.investito}
                  />
                  <Area
                    type="monotone"
                    yAxisId="right"
                    name="Stima Investito (pessimistica)"
                    dataKey="investitoStimaPessimistica"
                    stroke="#0284c7"
                    strokeWidth={2}
                    strokeDasharray="2 2"
                    fill="url(#colorInvestitoPatrimonio)"
                    fillOpacity={1}
                    dot={false}
                    activeDot={false}
                    hide={!visibleLines.investito}
                  />

                  {/* Stima mese mancante Andamento Netto: somma risparmio + stima investito, scenario ottimistico e pessimistico (tratteggiate, stesso grigio della linea Netto) */}
                  <Area
                    type="monotone"
                    yAxisId="left"
                    name="Stima Netto (ottimistica)"
                    dataKey="andamentoNettoStimaOttimistica"
                    stroke="#94a3b8"
                    strokeWidth={2}
                    strokeDasharray="2 2"
                    fill="url(#colorNettoPatrimonio)"
                    fillOpacity={1}
                    dot={false}
                    activeDot={false}
                    hide={!visibleLines.netto}
                  />
                  <Area
                    type="monotone"
                    yAxisId="left"
                    name="Stima Netto (pessimistica)"
                    dataKey="andamentoNettoStimaPessimistica"
                    stroke="#94a3b8"
                    strokeWidth={2}
                    strokeDasharray="2 2"
                    fill="url(#colorNettoPatrimonio)"
                    fillOpacity={1}
                    dot={false}
                    activeDot={false}
                    hide={!visibleLines.netto}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Right 1/3 - Monthly Detail List */}
          <div className="lg:col-span-1 border-t lg:border-t-0 lg:border-l border-slate-100 lg:pl-6 pt-4 lg:pt-0 flex flex-col h-full justify-between">
            <div className="mb-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Riepilogo Mensile</span>
            </div>
            <div className="h-44 overflow-y-auto pr-1 space-y-2 scrollbar-thin scrollbar-thumb-slate-200">
              {[...sortedRisparmio].reverse().map((r, idx) => {
                const rispVal = r.risparmioNetto ?? r.risparmio ?? 0;
                const invVal = r.investito ?? r.investiti ?? 0;
                return (
                  <div key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs transition-all hover:bg-slate-100/70">
                    <div>
                      <span className="font-bold text-slate-700 block">{r.mese}</span>
                      <span className="text-[10px] text-slate-400 font-medium block">{r.anno}</span>
                    </div>
                    <div className="text-right space-y-0.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="text-[9px] text-slate-400 font-medium">Risp:</span>
                        <span className={`font-bold ${rispVal >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {formatEuro(rispVal)}
                        </span>
                      </div>
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="text-[9px] text-slate-400 font-medium">Inv:</span>
                        <span className="font-bold text-sky-600">
                          {formatEuro(invVal)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>


    </div>
  );
}
