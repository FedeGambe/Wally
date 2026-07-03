import React from 'react';
import {
  Database,
  Wallet,
  ChevronUp,
  TrendingUp,
  Calendar,
  Award,
  Coins,
  Briefcase,
  Activity,
  ChevronRight,
  Shield,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  BarChart,
  Bar,
} from 'recharts';

interface CruscottoGeneraleProps {
  CRUSCOTTO_GENERALE: any;
  CRUSCOTTO_ANNO: any;
  calculatedRendimentoAnnuo: number | undefined;
  elapsedMonthsForSelectedYear: number;
  globalSelectedYear: string;
  nestedPieData: {
    macroData: any[];
    detailData: any[];
  };
  totalAssetAllocation: number;
  selectedMacroCategory: 'Azioni' | 'Obbligazioni' | 'Monetari' | null;
  setSelectedMacroCategory: (cat: 'Azioni' | 'Obbligazioni' | 'Monetari' | null) => void;
  filteredDetailData: any[];
  subTab: 'valore' | 'crescita' | 'mensile';
  setSubTab: (tab: 'valore' | 'crescita' | 'mensile') => void;
  timeRange: 'storico' | '12mesi';
  setTimeRange: (range: 'storico' | '12mesi') => void;
  chartData: any[];
  globalInspectorRecord: any;
  cruscottoRows: any[];
  formatEuro: (val: any) => string;
  formatPercent: (val: any) => string;
  lastValidRendimento: any;
}

export default function CruscottoGenerale({
  CRUSCOTTO_GENERALE,
  CRUSCOTTO_ANNO,
  calculatedRendimentoAnnuo,
  elapsedMonthsForSelectedYear,
  globalSelectedYear,
  nestedPieData,
  totalAssetAllocation,
  selectedMacroCategory,
  setSelectedMacroCategory,
  filteredDetailData,
  subTab,
  setSubTab,
  timeRange,
  setTimeRange,
  chartData,
  globalInspectorRecord,
  cruscottoRows,
  formatEuro,
  formatPercent,
  lastValidRendimento,
}: CruscottoGeneraleProps) {
  return (
    <div className="space-y-6 text-left animate-fadeIn">
      {/* Key KPI grouped section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GRUPPO 1: DATI CUMULATI STORICI */}
        <div className="bg-slate-50/55 dark:bg-[#0c1425]/40 p-4 rounded-3xl border border-slate-200/75 dark:border-slate-800/80 shadow-xs space-y-3 text-left">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-black uppercase text-slate-400 dark:text-slate-300 tracking-wider flex items-center gap-1.5">
              <Database className="w-4 h-4 text-slate-400 dark:text-slate-300" />
              Dati Cumulati Storici
            </span>
            <span className="text-[9px] bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full font-bold">
              Sempre Aggiornato
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Portafoglio Attuale Box */}
            <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white p-5 rounded-2xl border border-indigo-950 dark:border-indigo-900 shadow-md flex flex-col justify-between h-36 transition-all duration-300 hover:shadow-lg hover:scale-[1.01]">
              <div className="flex justify-between items-start">
                <span className="text-[10px] text-indigo-300 font-extrabold uppercase tracking-wider block">Portafoglio Attuale</span>
                <Wallet className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="mt-2">
                <span className="text-2xl font-black font-display text-white block">
                  {formatEuro(CRUSCOTTO_GENERALE.azioniInvestitoCum + CRUSCOTTO_GENERALE.obbligazioniInvestitoCum + CRUSCOTTO_GENERALE.monetariInvestitoCum + CRUSCOTTO_GENERALE.rendimentoCumulativoEuro)}
                </span>
              </div>
              <div className="border-t border-indigo-800/60 pt-2 mt-2">
                <p className="text-[9px] text-indigo-300 font-medium">Investito: <span className="font-bold text-white">{formatEuro(CRUSCOTTO_GENERALE.azioniInvestitoCum + CRUSCOTTO_GENERALE.obbligazioniInvestitoCum + (CRUSCOTTO_GENERALE.monetariInvestitoCum || 0))}</span></p>
              </div>
            </div>

            {/* Plusvalenza Cumulata Box */}
            <div className={`p-5 rounded-2xl border flex flex-col justify-between h-36 transition-all duration-300 hover:shadow-md ${
              CRUSCOTTO_GENERALE.rendimentoCumulativoEuro >= 0
                ? 'bg-emerald-50/10 dark:bg-emerald-950/10 border-emerald-500/30 dark:border-emerald-500/25 shadow-[0_0_15px_rgba(16,185,129,0.12)] hover:shadow-[0_0_20px_rgba(16,185,129,0.18)]'
                : 'bg-white dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800/60 shadow-xs'
            }`}>
              <div className="flex justify-between items-start">
                <span className="text-[10px] text-slate-400 dark:text-slate-300 font-extrabold uppercase tracking-wider block">Plusvalenza Cumulata</span>
                <div className="bg-emerald-50 dark:bg-emerald-950/50 p-1 rounded-lg">
                  <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
              <div className="mt-2">
                <span className="text-2xl font-extrabold font-display text-emerald-600 dark:text-emerald-400 block flex items-center gap-0.5">
                  <ChevronUp className="w-5 h-5 shrink-0" />
                  {formatEuro(CRUSCOTTO_GENERALE.rendimentoCumulativoEuro)}
                </span>
              </div>
              <div className="border-t border-slate-100 dark:border-slate-800 pt-2 mt-2 flex justify-between items-center text-[9px]">
                <span className="text-slate-400 dark:text-slate-400 font-medium">Rendimento Totale</span>
                <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.5 rounded font-extrabold font-mono">
                  {formatPercent(lastValidRendimento?.rendimentoCumulativoPerc)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* GRUPPO 2: PERFORMANCE ANNO SELEZIONATO */}
        <div className="bg-slate-50/55 dark:bg-[#0c1425]/40 p-4 rounded-3xl border border-slate-200/75 dark:border-slate-800/80 shadow-xs space-y-3 text-left">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-black uppercase text-slate-400 dark:text-slate-300 tracking-wider flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-400 dark:text-slate-300" />
              Performance Anno {globalSelectedYear}
            </span>
            <span className="text-[9px] bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full font-bold">
              Anno Selezionato
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Rendimento Annuo Box */}
            <div className="bg-white dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/60 shadow-xs flex flex-col justify-between h-36 transition-all duration-300 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700">
              <div className="flex justify-between items-start">
                <span className="text-[10px] text-slate-400 dark:text-slate-300 font-extrabold uppercase tracking-wider block">Rendimento {globalSelectedYear}</span>
                <div className="bg-violet-50 dark:bg-violet-950/50 p-1 rounded-lg">
                  <Award className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                </div>
              </div>
              <div className="mt-2">
                <span className="text-2xl font-extrabold font-display text-violet-600 dark:text-violet-400 block flex items-baseline gap-1 flex-wrap">
                  <span>{formatEuro(CRUSCOTTO_ANNO.rendimentoAnnualeEuro)}</span>
                  <span className="text-xs font-semibold text-violet-400 dark:text-violet-300">({formatPercent(calculatedRendimentoAnnuo)})</span>
                </span>
              </div>
              <div className="border-t border-slate-100 dark:border-slate-800 pt-2 mt-2 flex justify-between items-center text-[9px] text-slate-400">
                <span>Media mensile ({elapsedMonthsForSelectedYear}m)</span>
                <span className="font-bold text-slate-600 dark:text-slate-300 font-mono">{formatPercent(CRUSCOTTO_ANNO.rendimentoMedioMensilePerc)}</span>
              </div>
            </div>

            {/* Contributo Anno Box */}
            <div className="bg-white dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/60 shadow-xs flex flex-col justify-between h-36 transition-all duration-300 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700">
              <div className="flex justify-between items-start">
                <span className="text-[10px] text-slate-400 dark:text-slate-300 font-extrabold uppercase tracking-wider block">Contributo {globalSelectedYear}</span>
                <div className="bg-indigo-50 dark:bg-indigo-950/50 p-1 rounded-lg">
                  <Coins className="w-4 h-4 text-indigo-600 dark:text-indigo-455" />
                </div>
              </div>
              <div className="mt-2">
                <span className="text-2xl font-extrabold font-display text-slate-800 dark:text-slate-100 block">
                  {formatEuro(CRUSCOTTO_ANNO.azioniInvestitoAnno + CRUSCOTTO_ANNO.obbligazioniInvestitoAnno + (CRUSCOTTO_ANNO.monetariInvestitoAnno || 0))}
                </span>
              </div>
              <div className="border-t border-slate-100 dark:border-slate-800 pt-2 mt-2 flex justify-between items-center text-[9px] text-slate-400">
                <span>Contributo Totale</span>
                <span className="font-extrabold text-indigo-600 dark:text-indigo-440 font-mono">
                  {formatEuro(CRUSCOTTO_GENERALE.azioniInvestitoCum + CRUSCOTTO_GENERALE.obbligazioniInvestitoCum + (CRUSCOTTO_GENERALE.monetariInvestitoCum || 0))}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Doppio Grafico a Torta (Nested Pie Chart) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between transition-all duration-300 hover:shadow-md h-[540px]">
          <div>
            <h3 className="font-bold text-slate-800 font-display text-base flex items-center gap-1.5 mb-1">
              <Briefcase className="w-5 h-5 text-indigo-600" />
              Ripartizione Asset e Strumenti
            </h3>
            <p className="text-xs text-slate-400 mb-2">
              Asset class all'interno, dettaglio strumenti all'esterno (Scalable e Trade Republic)
            </p>
          </div>

          {/* Custom compact Tooltip for Recharts */}
          {(() => {
            const CustomTooltip = ({ active, payload }: any) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                const val = payload[0].value;
                const name = payload[0].name;
                const total = totalAssetAllocation;
                const pct = total > 0 ? ((Number(val) / total) * 100).toFixed(1) : '0.0';

                // Use the exact color of the macro category or instrument slice
                const pctColor = data.color || payload[0].color || payload[0].payload?.color || '#10b981';

                return (
                  <div className="bg-slate-900/95 backdrop-blur-xs text-slate-100 px-4 py-3 rounded-2xl shadow-xl text-sm font-bold border border-slate-800 leading-tight">
                    <div className="flex items-center gap-2 mb-2 font-black">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: pctColor }} />
                      <span className="uppercase text-xs tracking-wider text-slate-200 truncate max-w-[180px]">{name}</span>
                    </div>
                    <div className="flex items-center justify-between gap-5 font-mono font-black text-white">
                      <span>{formatEuro(val)}</span>
                      <span style={{ color: pctColor }}>({pct}%)</span>
                    </div>
                  </div>
                );
              }
              return null;
            };

            return (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden mt-3">
                {/* 1. Macro Data Legend Tiles (Interactive buttons) - FULL WIDTH */}
                <div className="mb-4 shrink-0">
                  <div className="grid grid-cols-3 gap-2">
                    {nestedPieData.macroData.map((item, idx) => {
                      const value = item.value;
                      const percentage = totalAssetAllocation > 0 ? (value / totalAssetAllocation) * 105 : 0; // Wait, total allocation %
                      const actualPercent = totalAssetAllocation > 0 ? (value / totalAssetAllocation) * 100 : 0;
                      const categoryKey = item.name as 'Azioni' | 'Obbligazioni' | 'Monetari';
                      const isSelected = selectedMacroCategory === categoryKey;
                      const isAnySelected = selectedMacroCategory !== null;

                      // Dynamic professional styling based on state
                      let containerClass = '';
                      let textTitleClass = '';
                      let textPercentageClass = '';
                      let textAmountClass = '';
                      let dotColor = item.color;
                      let dotClass = '';

                      if (isSelected) {
                        if (categoryKey === 'Azioni') {
                          containerClass = 'bg-blue-950 border-blue-900 text-white shadow-md ring-2 ring-blue-500/30';
                          textTitleClass = 'text-blue-200 font-bold';
                          textPercentageClass = 'text-white font-black';
                          textAmountClass = 'text-blue-300';
                          dotColor = '#60a5fa'; // bright neon blue
                          dotClass = 'shadow-xs shadow-blue-400/50 animate-pulse';
                        } else if (categoryKey === 'Obbligazioni') {
                          containerClass = 'bg-orange-950 border-orange-900 text-white shadow-md ring-2 ring-orange-500/30';
                          textTitleClass = 'text-orange-200 font-bold';
                          textPercentageClass = 'text-white font-black';
                          textAmountClass = 'text-orange-300';
                          dotColor = '#fb923c'; // bright neon orange
                          dotClass = 'shadow-xs shadow-orange-400/50 animate-pulse';
                        } else if (categoryKey === 'Monetari') {
                          containerClass = 'bg-emerald-950 border-emerald-900 text-white shadow-md ring-2 ring-emerald-500/30';
                          textTitleClass = 'text-emerald-200 font-bold';
                          textPercentageClass = 'text-white font-black';
                          textAmountClass = 'text-emerald-300';
                          dotColor = '#34d399'; // bright neon green
                          dotClass = 'shadow-xs shadow-emerald-400/50 animate-pulse';
                        }
                      } else if (isAnySelected) {
                        containerClass = 'border-slate-100 bg-slate-50/40 opacity-45 hover:opacity-90 hover:bg-slate-100/60';
                        textTitleClass = 'text-slate-400 font-semibold';
                        textPercentageClass = 'text-slate-500 font-extrabold';
                        textAmountClass = 'text-slate-400/70';
                      } else {
                        containerClass = 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 shadow-xs';
                        textTitleClass = 'text-slate-600 font-bold';
                        textPercentageClass = 'text-slate-800 font-extrabold';
                        textAmountClass = 'text-slate-400';
                      }

                      return (
                        <button
                          key={idx}
                          onClick={() => setSelectedMacroCategory(isSelected ? null : categoryKey)}
                          className={`p-2 rounded-xl border flex flex-col justify-between text-left transition-all duration-200 cursor-pointer active:scale-[0.97] h-[64px] ${containerClass}`}
                        >
                          <div className="flex items-center gap-1.5 truncate w-full">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${dotClass}`} style={{ backgroundColor: dotColor }} />
                            <span className={`text-[10px] truncate uppercase tracking-wider ${textTitleClass}`}>{item.name}</span>
                          </div>
                          <div className="mt-0.5 flex flex-col">
                            <span className={`font-mono text-[11px] leading-tight ${textPercentageClass}`}>{actualPercent.toFixed(1)}%</span>
                            <span className={`text-[9px] font-mono leading-none ${textAmountClass}`}>{formatEuro(value)}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 50/50 Split Grid (Chart left, Micro Legend right) */}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 items-center min-h-0 overflow-hidden">
                  {/* Pie Chart Column - 50% split */}
                  <div className="h-full min-h-[240px] md:min-h-[260px] flex items-center justify-center relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        {/* Inner Pie: Macro asset allocation */}
                        <Pie
                          data={nestedPieData.macroData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          stroke="none"
                          dataKey="value"
                        >
                          {nestedPieData.macroData.map((entry: any, index: number) => (
                            <Cell key={`cell-macro-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        {/* Outer Pie: Detailed instruments */}
                        <Pie
                          data={nestedPieData.detailData}
                          cx="50%"
                          cy="50%"
                          innerRadius={85}
                          outerRadius={115}
                          stroke="none"
                          dataKey="value"
                        >
                          {nestedPieData.detailData.map((entry: any, index: number) => (
                            <Cell key={`cell-detail-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} wrapperStyle={{ zIndex: 100 }} />
                      </PieChart>
                    </ResponsiveContainer>

                    {/* Centered Label for Donut chart */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-1 z-10">
                      <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Investito</span>
                      <span className="text-sm font-black text-slate-800 font-mono">
                        {formatEuro(totalAssetAllocation)}
                      </span>
                    </div>
                  </div>

                  {/* Micro Data Legend Column - 50% split */}
                  <div className="h-full flex flex-col min-h-0 overflow-hidden pb-1">
                    <div className="flex items-center justify-between mb-1.5 shrink-0">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        Dettaglio Strumenti {selectedMacroCategory && `(${selectedMacroCategory})`}
                      </span>
                      {selectedMacroCategory && (
                        <button
                          onClick={() => setSelectedMacroCategory(null)}
                          className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer transition-colors"
                        >
                          Mostra tutti
                        </button>
                      )}
                    </div>
                    <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-200">
                      {filteredDetailData.map((item, idx) => {
                        const itemPerc = totalAssetAllocation > 0 ? (item.value / totalAssetAllocation) * 100 : 0;
                        return (
                          <div key={idx} className="flex items-center justify-between font-semibold py-1 border-b border-slate-50 hover:bg-slate-50/50 px-1.5 rounded-lg transition-colors text-[11px]">
                            <div className="flex items-center gap-2 truncate max-w-[130px] sm:max-w-[150px]">
                              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                              <span className="text-slate-500 truncate uppercase font-bold" title={item.name}>{item.name}</span>
                            </div>
                            <div className="flex items-center gap-2 font-mono text-right shrink-0">
                              <span className="text-slate-500 font-extrabold text-[10px]">({itemPerc.toFixed(1)}%)</span>
                              <span className="text-slate-880 font-bold">{formatEuro(item.value)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Analisi Portafoglio Widget */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between transition-all duration-300 hover:shadow-md h-[540px]">
          <div>
            <div className="flex flex-col gap-3 mb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="font-bold text-slate-800 font-display text-base flex items-center gap-1.5">
                  <Activity className={`w-5 h-5 ${
                    subTab === 'valore' ? 'text-indigo-600' :
                    subTab === 'crescita' ? 'text-emerald-600' : 'text-violet-600'
                  }`} />
                  Analisi Portafoglio
                </h3>
                
                {/* Premium mini-segmented control */}
                <div className="flex bg-slate-100 p-1 rounded-xl gap-0.5 border border-slate-200 select-none">
                  <button
                    onClick={() => setSubTab('valore')}
                    className={`text-[9px] px-2.5 py-1.5 font-extrabold rounded-lg transition-all cursor-pointer ${
                      subTab === 'valore'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-500 hover:text-indigo-600'
                    }`}
                  >
                    Investito vs Valore
                  </button>
                  <button
                    onClick={() => setSubTab('crescita')}
                    className={`text-[9px] px-2.5 py-1.5 font-extrabold rounded-lg transition-all cursor-pointer ${
                      subTab === 'crescita'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-500 hover:text-emerald-600'
                    }`}
                  >
                    Crescita Rendimento
                  </button>
                  <button
                    onClick={() => setSubTab('mensile')}
                    className={`text-[9px] px-2.5 py-1.5 font-extrabold rounded-lg transition-all cursor-pointer ${
                      subTab === 'mensile'
                        ? 'bg-violet-600 text-white shadow-sm'
                        : 'text-slate-500 hover:text-violet-600'
                    }`}
                  >
                    Rendimenti Mensili
                  </button>
                </div>
              </div>

              {/* Time Range Selector underneath sections */}
              <div className="flex justify-start sm:justify-end">
                <div className="flex bg-slate-100 p-1 rounded-xl gap-0.5 border border-slate-200 select-none">
                  <button
                    onClick={() => setTimeRange('storico')}
                    className={`text-[9px] px-3 py-1.5 font-extrabold rounded-lg transition-all cursor-pointer ${
                      timeRange === 'storico'
                        ? `${
                            subTab === 'valore' ? 'bg-indigo-600' :
                            subTab === 'crescita' ? 'bg-emerald-600' : 'bg-violet-600'
                          } text-white shadow-xs`
                        : `text-slate-500 ${
                            subTab === 'valore' ? 'hover:text-indigo-600' :
                            subTab === 'crescita' ? 'hover:text-emerald-600' : 'hover:text-violet-600'
                          }`
                    }`}
                  >
                    Storico
                  </button>
                  <button
                    onClick={() => setTimeRange('12mesi')}
                    className={`text-[9px] px-3 py-1.5 font-extrabold rounded-lg transition-all cursor-pointer ${
                      timeRange === '12mesi'
                        ? `${
                            subTab === 'valore' ? 'bg-indigo-600' :
                            subTab === 'crescita' ? 'bg-emerald-600' : 'bg-violet-600'
                          } text-white shadow-xs`
                        : `text-slate-500 ${
                            subTab === 'valore' ? 'hover:text-indigo-600' :
                            subTab === 'crescita' ? 'hover:text-emerald-600' : 'hover:text-violet-600'
                          }`
                    }`}
                  >
                    Ultimi 12 Mesi
                  </button>
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-400 mb-4 font-medium">
              {subTab === 'valore' && "Confronto storico tra il capitale depositato e l'attuale valore di mercato."}
              {subTab === 'crescita' && "Progresso della plusvalenza netta (€) con focus temporale e storico."}
              {subTab === 'mensile' && "Plusvalenza o minusvalenza mensile (€) registrata nel tempo."}
            </p>
          </div>

          {/* Single Unified Chart Area */}
          <div className="flex-1 flex flex-col justify-between gap-3 overflow-hidden">
            <div className="flex-1 min-h-[280px] flex flex-col justify-between">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">
                  {timeRange === '12mesi' ? "Focus Periodo (Ultimi 12 Mesi)" : "Storico Completo"}
                </span>
                <span className={`text-xs font-bold font-mono ${
                  subTab === 'valore' ? 'text-indigo-600' :
                  subTab === 'crescita' ? 'text-emerald-600' : 'text-violet-600'
                }`}>
                  {chartData.length > 0 ? (
                    <span className="text-[10px] text-slate-500">
                      {chartData[0]?.mese} - {chartData[chartData.length - 1]?.mese}
                    </span>
                  ) : ''}
                </span>
              </div>
              
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {subTab === 'valore' ? (
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorInvestitoValore" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.15}/>
                          <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.01}/>
                        </linearGradient>
                        <linearGradient id="colorValorePortafoglio" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.01}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="mese" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} tickFormatter={(val) => `€${Number(val).toLocaleString('it-IT')}`} />
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
                      <Area
                        type="monotone"
                        name="Capitale Investito"
                        dataKey="importoInvestitoCumulato"
                        stroke="#94a3b8"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorInvestitoValore)"
                        dot={timeRange === '12mesi' ? { r: 3.5, strokeWidth: 1.5, stroke: '#94a3b8', fill: '#fff' } : false}
                        activeDot={{ r: 5 }}
                      />
                      <Area
                        type="monotone"
                        name="Valore Portafoglio"
                        dataKey="valoreAttualePortafoglio"
                        stroke="#4f46e5"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorValorePortafoglio)"
                        dot={timeRange === '12mesi' ? { r: 3.5, strokeWidth: 2, stroke: '#4f46e5', fill: '#fff' } : false}
                        activeDot={{ r: 6 }}
                      />
                    </AreaChart>
                  ) : subTab === 'crescita' ? (
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorGlobalRendimentoSingle" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.01}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="mese" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} tickFormatter={(val) => `€${Number(val).toLocaleString('it-IT')}`} />
                      <Tooltip
                        formatter={(value: any) => [formatEuro(value), 'Plusvalenza']}
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
                      <Area
                        type="monotone"
                        dataKey="rendimentoCumulativoEuro"
                        stroke="#10b981"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorGlobalRendimentoSingle)"
                        dot={timeRange === '12mesi' ? { r: 3.5, strokeWidth: 2, stroke: '#10b981', fill: '#fff' } : false}
                        activeDot={{ r: 6 }}
                      />
                    </AreaChart>
                  ) : (
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="mese" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} tickFormatter={(val) => `€${Number(val).toLocaleString('it-IT')}`} />
                      <Tooltip
                        formatter={(value: any) => [formatEuro(value), 'Rendimento Mese']}
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
                      <Bar dataKey="rendimentoMensileEuro" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.rendimentoMensileEuro >= 0 ? '#10b981' : '#f43f5e'} />
                        ))}
                      </Bar>
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-xs font-semibold text-slate-500 flex justify-between items-center h-10 shrink-0">
            <div>
              <span className="block text-[9px] uppercase text-slate-400 font-bold">Inizio Range</span>
              <span className="text-slate-800 font-bold font-mono">{chartData[0]?.mese || 'N/D'}</span>
            </div>
            <div className="text-right">
              <span className="block text-[9px] uppercase text-slate-400 font-bold">Fine Range</span>
              <span className={`font-bold font-mono ${
                subTab === 'valore' ? 'text-indigo-600' :
                subTab === 'crescita' ? 'text-emerald-600' : 'text-violet-600'
              }`}>
                {chartData[chartData.length - 1]?.mese || 'N/D'} ({formatEuro(chartData[chartData.length - 1]?.valoreAttualePortafoglio || 0)})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid containing Monthly returns inspector card on the left, and Distribuzione Asset Class table on the right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
        {/* Left Column: Inspector widget */}
        <div className="lg:col-span-1 bg-slate-50 p-6 rounded-3xl border border-slate-200 flex flex-col justify-between transition-all duration-300 hover:shadow-md">
          {globalInspectorRecord ? (
            <>
              <div>
                <span className="text-[10px] text-slate-450 font-bold uppercase tracking-wider block">Filtro Mese Selezionato</span>
                <h3 className="text-xl font-bold font-display text-slate-800 capitalize mt-2 flex items-center justify-between">
                  <span>{globalInspectorRecord.mese}</span>
                  <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                    globalInspectorRecord.rendimentoMensileEuro >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {formatPercent(globalInspectorRecord.rendimentoMensilePerc)}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-1.5 font-medium">Sintesi dei movimenti del portafoglio nel mese</p>
              </div>

              <div className="my-6 space-y-3 border-t border-b border-slate-200 py-4 font-semibold text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Valore Portafoglio:</span>
                  <span className="text-slate-800 font-bold font-mono">{formatEuro(globalInspectorRecord.valoreAttualePortafoglio)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Importo Investito Mese:</span>
                  <span className="text-slate-850 font-bold font-mono">{formatEuro(globalInspectorRecord.importoMensileInvestito)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Risultato Netto (€):</span>
                  <span className={`font-bold font-mono ${globalInspectorRecord.rendimentoMensileEuro >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {formatEuro(globalInspectorRecord.rendimentoMensileEuro)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Plusvalenza Cumulata:</span>
                  <span className="text-indigo-600 font-bold font-mono">{formatEuro(globalInspectorRecord.rendimentoCumulativoEuro)}</span>
                </div>
              </div>

              <div className="text-[10px] text-slate-400 font-medium">
                * Mostra il mese selezionato globalmente o quello precedente se è selezionato il mese corrente.
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-xs text-slate-400">
              Nessun dato disponibile per il periodo selezionato.
            </div>
          )}
        </div>

        {/* Right Column: Distribuzione Asset Class per Anno */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm transition-all duration-300 hover:shadow-md flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-800 font-display text-base mb-4">Distribuzione Asset Class per Anno</h3>
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-sm text-left">
                <thead className="bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wider border-b border-indigo-100">
                  <tr>
                    <th className="px-6 py-4 rounded-tl-2xl">Esercizio</th>
                    <th className="px-6 py-4 text-right">Azioni Cumulato</th>
                    <th className="px-6 py-4 text-right">Azioni Annuale</th>
                    <th className="px-6 py-4 text-right">Obbligazioni Cumulato</th>
                    <th className="px-6 py-4 text-right">Obbligazioni Annuale</th>
                    <th className="px-6 py-4 text-right">Monetari Cumulato</th>
                    <th className="px-6 py-4 text-right">Monetari Annuale</th>
                    <th className="px-6 py-4 text-right rounded-tr-2xl">Valutazione Totale</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 text-slate-700 font-medium">
                  {cruscottoRows.map((row: any) => {
                    const isCorrente = Number(row.anno) === Number(cruscottoRows[0]?.anno);
                    const valuationSum = Number(row.azioniInvestitoCum || 0) + 
                                         Number(row.obbligazioniInvestitoCum || 0) + 
                                         Number(row.monetariInvestitoCum || 0) + 
                                         Number(row.rendimentoCumulativoEuro || 0);
                    return (
                      <tr key={row.anno} className="hover:bg-slate-50/50 transition-colors duration-155">
                        <td className="px-6 py-3.5 font-bold text-slate-800">
                          {row.anno} {isCorrente ? '(Corrente)' : ''}
                        </td>
                        <td className="px-6 py-3.5 text-right font-mono">{formatEuro(row.azioniInvestitoCum)}</td>
                        <td className="px-6 py-3.5 text-right text-emerald-600 font-bold font-mono">
                          +{formatEuro(row.azioniInvestitoAnno)}
                        </td>
                        <td className="px-6 py-3.5 text-right font-mono">{formatEuro(row.obbligazioniInvestitoCum)}</td>
                        <td className="px-6 py-3.5 text-right text-emerald-600 font-bold font-mono">
                          +{formatEuro(row.obbligazioniInvestitoAnno)}
                        </td>
                        <td className="px-6 py-3.5 text-right font-mono">{formatEuro(row.monetariInvestitoCum)}</td>
                        <td className="px-6 py-3.5 text-right text-emerald-600 font-bold font-mono">
                          +{formatEuro(row.monetariInvestitoAnno)}
                        </td>
                        <td className="px-6 py-3.5 text-right font-bold text-indigo-600 font-mono">
                          {formatEuro(valuationSum)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
