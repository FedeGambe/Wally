import React from 'react';
import CruscottoGenerale from '../subviews/CruscottoGenerale';
import Conti from '../subviews/Conti';
import FondoPensione from '../subviews/FondoPensione';
import { formatEuro } from '../utils/format';
import { useInvestimentiData } from '../hooks/useInvestimentiData';

interface InvestimentiProps {
  selectedMonth?: string;
  setSelectedMonth?: (month: string) => void;
  selectedYear?: string;
  setSelectedYear?: (year: string) => void;
  theme?: 'light' | 'dark';
}

export default function Investimenti({
  selectedMonth: globalSelectedMonth = 'Luglio',
  selectedYear: globalSelectedYear = '2026',
}: InvestimentiProps = {}) {
  const {
    activeTab, setActiveTab,
    activeConto, setActiveConto,
    selectedMacroCategory, setSelectedMacroCategory,
    subTab, setSubTab,
    timeRange, setTimeRange,
    isSticky,
    CRUSCOTTO_GENERALE, CRUSCOTTO_ANNO,
    calculatedRendimentoAnnuo, elapsedMonthsForSelectedYear,
    nestedPieData, totalAssetAllocation, filteredDetailData,
    chartData, globalInspectorRecord, cruscottoRows,
    formatPercent,
    lastValidRendimento,
    accountKPIs,
    localScalableInstruments, localTradeRepublicInstruments,
    sortedFilteredRecords,
    localFondoPensione
  } = useInvestimentiData(globalSelectedMonth, globalSelectedYear);

  return (
    <div className="space-y-6">
      {/* 3 Inner Tabs buttons (Sticky & Glassmorphic) */}
      <div
        className={`sticky transition-all duration-300 z-30 ${
          isSticky
            ? 'top-[-16px] md:top-[-32px] -mx-4 px-4 md:-mx-8 md:px-8 pt-4 pb-2 bg-slate-50/30 dark:bg-[#060a13]/30 backdrop-blur-md border-b border-slate-200/30 dark:border-slate-800/10 shadow-xs'
            : 'top-0 pt-0 pb-3 bg-transparent'
        }`}
      >
        <div className={`flex transition-all duration-300 p-1.5 rounded-2xl border gap-2 ${
          isSticky
            ? 'bg-white/35 dark:bg-[#0c1425]/35 border-slate-200/30 dark:border-slate-800/20'
            : 'bg-white/85 dark:bg-[#0c1425]/85 border-slate-200 dark:border-slate-800/60 shadow-xs'
        }`}>
          <button
            onClick={() => setActiveTab('cruscotto')}
            className={`flex-1 px-2 sm:px-5 py-2 text-[11px] sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'cruscotto'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/30'
            }`}
          >
            <span className="sm:hidden">Cruscotto</span>
            <span className="hidden sm:inline">Cruscotto Generale</span>
          </button>
          <button
            onClick={() => setActiveTab('conti')}
            className={`flex-1 px-2 sm:px-5 py-2 text-[11px] sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'conti'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/30'
            }`}
          >
            Conti
          </button>
          <button
            onClick={() => setActiveTab('pensione')}
            className={`flex-1 px-2 sm:px-5 py-2 text-[11px] sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'pensione'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/30'
            }`}
          >
            Fondo Pensione
          </button>
        </div>
      </div>

      {/* TAB 1: Cruscotto Generale */}
      {activeTab === 'cruscotto' && (
        <CruscottoGenerale
          CRUSCOTTO_GENERALE={CRUSCOTTO_GENERALE}
          CRUSCOTTO_ANNO={CRUSCOTTO_ANNO}
          calculatedRendimentoAnnuo={calculatedRendimentoAnnuo}
          elapsedMonthsForSelectedYear={elapsedMonthsForSelectedYear}
          globalSelectedYear={globalSelectedYear}
          nestedPieData={nestedPieData}
          totalAssetAllocation={totalAssetAllocation}
          selectedMacroCategory={selectedMacroCategory}
          setSelectedMacroCategory={setSelectedMacroCategory}
          filteredDetailData={filteredDetailData}
          subTab={subTab}
          setSubTab={setSubTab}
          timeRange={timeRange}
          setTimeRange={setTimeRange}
          chartData={chartData}
          globalInspectorRecord={globalInspectorRecord}
          cruscottoRows={cruscottoRows}
          formatEuro={formatEuro}
          formatPercent={formatPercent}
          lastValidRendimento={lastValidRendimento}
        />
      )}

      {/* TAB 2: Conti details */}
      {activeTab === 'conti' && (
        <Conti
          activeConto={activeConto}
          setActiveConto={setActiveConto}
          accountKPIs={accountKPIs}
          localScalableInstruments={localScalableInstruments}
          localTradeRepublicInstruments={localTradeRepublicInstruments}
          sortedFilteredRecords={sortedFilteredRecords}
          globalSelectedYear={globalSelectedYear}
          formatEuro={formatEuro}
          formatPercent={formatPercent}
        />
      )}

      {/* TAB 3: Fondo Pensione data */}
      {activeTab === 'pensione' && (
        <FondoPensione
          FONDO_PENSIONE_DATA={localFondoPensione}
          formatEuro={formatEuro}
          selectedMonthName={globalSelectedMonth}
          selectedYearStr={globalSelectedYear}
        />
      )}
    </div>
  );
}
