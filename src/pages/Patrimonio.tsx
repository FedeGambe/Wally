import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Coins,
  ShieldAlert,
  AlertTriangle,
  Calendar,
  Layers,
  TrendingUp,
  Info,
  PiggyBank,
  BarChart3
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { ContoPatrimonio } from '../data/mockData';
import { useFinanceData } from '../context/FinanceDataContext';
import FinanceKpiCard from '../components/FinanceKpiCard';

export default function Patrimonio() {
  const { data } = useFinanceData();
  const [selectedConto, setSelectedConto] = useState<ContoPatrimonio | null>(null);
  const [visibleLines, setVisibleLines] = useState({
    netto: true,
    risparmio: true,
    investito: true,
  });

  const formatEuro = (value: any) => {
    if (value === undefined || value === null || isNaN(Number(value)) || value === '') {
      return '***';
    }
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', useGrouping: true }).format(Number(value));
  };

  const formatPercent = (value: any) => {
    if (value === undefined || value === null || isNaN(Number(value)) || value === '') {
      return '***%';
    }
    const num = Number(value);
    return num.toLocaleString('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';
  };

  const localConti = data.patrimonio;
  const localRisparmio = data.risparmio;
  const localRendimenti = data.rendimentiInvestimenti;
  const localCapitaleImpegnato = data.capitaleImpegnato;

  // Sum aggregates based on localConti
  const totalWealth = useMemo(() => localConti.reduce((sum, item) => sum + item.capitaleTotale, 0), [localConti]);
  const totalDisponibile = useMemo(() => localConti.reduce((sum, item) => sum + item.capitaleDisponibile, 0), [localConti]);
  const totalInvestito = useMemo(() => localConti.reduce((sum, item) => sum + item.capitaleInvestito, 0), [localConti]);
  const totalImpegnato = useMemo(() => {
    return localCapitaleImpegnato.reduce((sum, item) => sum + (item.capitaleImpegnato || 0), 0);
  }, [localCapitaleImpegnato]);

  // Locked commitments pie dataset
  const engagedCapitalData = useMemo(() => {
    return localCapitaleImpegnato.map((item) => ({
      name: item.categoria,
      value: item.capitaleImpegnato
    }));
  }, [localCapitaleImpegnato]);

  const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#06b6d4', '#10b981'];

  // Historical Net worth progression
  const evolutionData = useMemo(() => {
    return localRendimenti.map((item, idx) => {
      const calculatedBase = 44000 + (idx * 1650) + (item.valoreAttualePortafoglio || 0) * 0.15;
      return {
        mese: item.mese,
        patrimonio: calculatedBase
      };
    });
  }, [localRendimenti]);

  // Sort and process savings trend from localRisparmio
  const sortedRisparmio = useMemo(() => {
    const calendarOrder = [
      'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
      'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
    ];
    return [...localRisparmio].sort((a, b) => {
      const idxA = calendarOrder.indexOf(a.mese);
      const idxB = calendarOrder.indexOf(b.mese);
      const valA = a.anno * 12 + (idxA !== -1 ? idxA : 0);
      const valB = b.anno * 12 + (idxB !== -1 ? idxB : 0);
      return valA - valB;
    });
  }, [localRisparmio]);

  // Cumulative savings sum + monthly investments from Rendimenti (Somma attuale / valoreAttualePortafoglio)
  const cumulativeRisparmioData = useMemo(() => {
    // Month abbreviations helper
    const getMonthIndex = (mStr: string): number => {
      const clean = mStr.toLowerCase().trim();
      if (clean.includes('gen') || clean.includes('jan')) return 0;
      if (clean.includes('feb')) return 1;
      if (clean.includes('mar')) return 2;
      if (clean.includes('apr')) return 3;
      if (clean.includes('mag') || clean.includes('may')) return 4;
      if (clean.includes('giu') || clean.includes('jun')) return 5;
      if (clean.includes('lug') || clean.includes('jul')) return 6;
      if (clean.includes('ago') || clean.includes('aug')) return 7;
      if (clean.includes('set') || clean.includes('sep')) return 8;
      if (clean.includes('ott') || clean.includes('oct')) return 9;
      if (clean.includes('nov')) return 10;
      if (clean.includes('dic') || clean.includes('dec')) return 11;
      return -1;
    };

    const getYearFromStr = (yStr: string): number => {
      const clean = yStr.toLowerCase().trim();
      const matches = clean.match(/\b\d{2,4}\b/g);
      if (matches && matches.length > 0) {
        const yrNum = parseInt(matches[matches.length - 1], 10);
        if (yrNum < 100) return 2000 + yrNum;
        return yrNum;
      }
      return -1;
    };
    const BASE = 5560.86;
    let runningSavings = 0;
    const rawData = sortedRisparmio.map(r => {
      runningSavings += (r.risparmioNetto || r.risparmio || 0);

      // Find matching record in localRendimenti
      const matchingRendimento = localRendimenti.find(rend => {
        const rMonthIdx = getMonthIndex(r.mese);
        const rendMonthIdx = getMonthIndex(rend.mese || '');
        if (rMonthIdx === -1 || rendMonthIdx === -1) return false;
        if (rMonthIdx !== rendMonthIdx) return false;

        const rendYear = getYearFromStr(rend.mese || '');
        if (rendYear !== -1 && rendYear !== r.anno) return false;

        return true;
      });

      const investitoValue = matchingRendimento
        ? (matchingRendimento.valoreAttualePortafoglio || null)
        : (r.investito || r.investiti || null);

      const risparmioCumulativo = (r.andamentoRisparmio !== undefined && r.andamentoRisparmio !== null && r.andamentoRisparmio !== 0)
        ? r.andamentoRisparmio
        : (runningSavings + BASE);

      const andamentoNettoValue = (r.andamentoNetto !== undefined && r.andamentoNetto !== null && r.andamentoNetto !== 0)
        ? r.andamentoNetto
        : (risparmioCumulativo + (investitoValue || 0));

      return {
        mese: r.mese,
        anno: r.anno,
        uniqueKey: `${r.mese} ${r.anno}`,
        risparmioCumulativo,
        investito: investitoValue,
        andamentoNetto: andamentoNettoValue
      };
    });

    // Find the last index with a valid non-null, non-zero investito value
    let lastValidIndex = -1;
    for (let i = rawData.length - 1; i >= 0; i--) {
      if (rawData[i].investito !== null && rawData[i].investito !== undefined && rawData[i].investito !== 0) {
        lastValidIndex = i;
        break;
      }
    }

    // For all indices after lastValidIndex, set investito to undefined so Recharts stops drawing there
    return rawData.map((d, idx) => {
      if (idx > lastValidIndex) {
        return {
          ...d,
          investito: undefined
        };
      }
      return d;
    });
  }, [sortedRisparmio, localRendimenti]);

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Wealth card 1 - Capitale Totale (Slate-900) */}
        <FinanceKpiCard
          id="card-patrimonio"
          type="totale"
          title="Capitale Totale"
          value={totalDisponibile + totalInvestito}
          icon={BarChart3}
          detail={
            <>
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
              <span>Incluso Accantonamento: <strong className="text-xs sm:text-[13px] font-black font-mono text-white tracking-tight ml-1">{formatEuro(totalDisponibile + totalInvestito + totalImpegnato)}</strong></span>
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
              <span className="w-2 h-2 rounded-full bg-indigo-300 animate-pulse"></span>
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
              <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse"></span>
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
              <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse"></span>
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
                        ? 'border-indigo-500 bg-indigo-50/25 shadow-xs'
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
                          <div className="p-5 mt-1 mb-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 shadow-md">
                            <div className="flex justify-between items-center border-b border-slate-200 pb-3 mb-3">
                              <div>
                                <h4 className="font-bold font-display text-sm text-slate-800">{conto.categoria}</h4>
                                <p className="text-[10px] text-slate-500">Analisi approfondita disponibilità del conto</p>
                              </div>
                              <span className="text-[10px] bg-indigo-50 text-indigo-600 font-bold px-2.5 py-0.5 rounded-full border border-indigo-200/60">
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
                                  <span className="font-bold text-indigo-600">{formatEuro(conto.capitaleInvestito)}</span>
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
                              <Info className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
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
        <div className="space-y-6">
          {/* 1. Dedicated Capitale Impegnato Box Widget */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm text-left transition-all duration-300 hover:shadow-md flex flex-col justify-between min-h-[340px]">
            <div>
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-500" />
                <div>
                  <h3 className="font-bold text-slate-800 font-display text-base leading-snug">Capitale Accantonato</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Suddivisione del capitale vincolato e dei debiti attivi per conto</p>
                </div>
              </div>

              {/* Pie Chart of Capitale Impegnato */}
              <div className="h-44 mt-4 relative">
                {engagedCapitalData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={engagedCapitalData}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={68}
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
                      <span className="text-sm font-black font-display text-amber-600">{formatEuro(totalImpegnato)}</span>
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-400 font-medium">
                    Nessun capitale accantonato presente nel foglio Google Sheets
                  </div>
                )}
              </div>
            </div>

            {/* Detailed Breakdown Legend Table */}
            <div className="border-t border-slate-100 pt-4 mt-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-2">Dettaglio Voci accantonamenti (dal Google Sheet)</span>
              <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                {engagedCapitalData.length > 0 ? (
                  engagedCapitalData.map((item, idx) => (
                    <div key={idx} className="flex items-start justify-between gap-1.5 leading-tight pb-1.5 border-b border-slate-50 last:border-b-0">
                      <div className="flex items-start gap-1.5 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full mt-1 shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                        <span className="text-slate-600 font-medium text-xs truncate" title={item.name}>{item.name}</span>
                      </div>
                      <span className="font-bold text-slate-800 text-xs shrink-0">{formatEuro(item.value)}</span>
                    </div>
                  ))
                ) : (
                  <span className="text-xs text-slate-400 italic">I conti sincronizzati non hanno somme vincolate.</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* 2. Unified Dedicated Trend Card - 2/3 Area Chart with 3 Lines & 1/3 Monthly Summary */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm text-left transition-all duration-300 hover:shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-500" />
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
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-2xs'
                : 'bg-transparent text-slate-400 border-slate-200 hover:bg-indigo-50/20 opacity-60'
                }`}
            >
              <span className={`w-2 h-2 rounded-full transition-all ${visibleLines.investito ? 'bg-indigo-500' : 'bg-slate-300'}`}></span>
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
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                    </linearGradient>
                  </defs>

                  <Tooltip
                    formatter={(value: any, name: any) => {
                      const translatedName =
                        name === 'andamentoNetto' || name === 'Andamento Netto' ? 'Andamento Netto' :
                          (name === 'risparmioCumulativo' || name === 'Andamento Risparmio') ? 'Andamento Risparmio' :
                            (name === 'investito' || name === 'Quota Investimenti') ? 'Quota Investimenti' : name;
                      return [
                        `€${Number(value).toLocaleString('it-IT', { useGrouping: true })}`,
                        translatedName
                      ];
                    }}
                    contentStyle={{
                      background: '#1e293b',
                      border: 'none',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px'
                    }}
                  />

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
                    stroke="#4f46e5"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorInvestitoPatrimonio)"
                    dot={false}
                    activeDot={false}
                    hide={!visibleLines.investito}
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
                        <span className="font-bold text-indigo-600">
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
