/**
 * Pagina "Investimenti": contenitore con 4 schede (Cruscotto, Rendimenti, Conti, Fondo Pensione).
 * Questo file NON contiene la logica di calcolo: fa solo da "guscio" che sceglie quale sotto-vista
 * mostrare (subviews/CruscottoGenerale, Rendimenti, Conti, FondoPensione) e passa loro i dati già
 * pronti. Tutti i calcoli (asset allocation, rendimenti, KPI dei conti broker, ecc.) vivono nel
 * custom hook useInvestimentiData (src/hooks/useInvestimentiData.ts), che a sua volta si appoggia
 * a useFinanceData() e a src/utils/cruscottoInvestimenti.ts. Qui vengono solo destrutturati i
 * risultati dell'hook e smistati alla scheda attiva.
 */
import React from 'react';
import CruscottoGenerale from '../subviews/CruscottoGenerale';
import Rendimenti from '../subviews/Rendimenti';
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
  // Mese/anno selezionati globalmente in App.tsx (header); i valori di default qui sotto scattano
  // solo se la pagina viene montata senza props (es. in isolamento/test), non nell'uso normale.
  selectedMonth: globalSelectedMonth = 'Luglio',
  selectedYear: globalSelectedYear = '2026',
}: InvestimentiProps = {}) {
  // Tutta la logica (filtri, aggregazioni, KPI) è calcolata dall'hook: qui prendiamo solo i risultati.
  const {
    activeTab, setActiveTab,
    activeConto, setActiveConto,
    selectedMacroCategories, setSelectedMacroCategories,
    timeRange, setTimeRange,
    isSticky,
    CRUSCOTTO_GENERALE, CRUSCOTTO_ANNO,
    calculatedRendimentoAnnuo, elapsedMonthsForSelectedYear,
    nestedPieData, totalAssetAllocation, filteredDetailData,
    chartData, globalInspectorRecord, cruscottoRows,
    formatPercent,
    lastValidRendimento,
    investitoMeseCorrente, portafoglioStimatoAttuale, contributoMeseCorrente,
    accountKPIs,
    localScalableInstruments, localTradeRepublicInstruments,
    sortedFilteredRecords,
    localFondoPensione,
    localRendimenti, activeRendimenti
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
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/30'
            }`}
          >
            Cruscotto
          </button>
          <button
            onClick={() => setActiveTab('rendimenti')}
            className={`flex-1 px-2 sm:px-5 py-2 text-[11px] sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'rendimenti'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/30'
            }`}
          >
            Rendimenti
          </button>
          <button
            onClick={() => setActiveTab('conti')}
            className={`flex-1 px-2 sm:px-5 py-2 text-[11px] sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'conti'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/30'
            }`}
          >
            Conti
          </button>
          <button
            onClick={() => setActiveTab('pensione')}
            className={`flex-1 px-2 sm:px-5 py-2 text-[11px] sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'pensione'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/30'
            }`}
          >
            Fondo Pensione
          </button>
        </div>
      </div>

      {/* TAB 1: Cruscotto */}
      {activeTab === 'cruscotto' && (
        <CruscottoGenerale
          CRUSCOTTO_GENERALE={CRUSCOTTO_GENERALE}
          CRUSCOTTO_ANNO={CRUSCOTTO_ANNO}
          calculatedRendimentoAnnuo={calculatedRendimentoAnnuo}
          elapsedMonthsForSelectedYear={elapsedMonthsForSelectedYear}
          globalSelectedYear={globalSelectedYear}
          nestedPieData={nestedPieData}
          totalAssetAllocation={totalAssetAllocation}
          selectedMacroCategories={selectedMacroCategories}
          setSelectedMacroCategories={setSelectedMacroCategories}
          filteredDetailData={filteredDetailData}
          timeRange={timeRange}
          setTimeRange={setTimeRange}
          chartData={chartData}
          localRendimenti={localRendimenti}
          globalInspectorRecord={globalInspectorRecord}
          cruscottoRows={cruscottoRows}
          formatEuro={formatEuro}
          formatPercent={formatPercent}
          lastValidRendimento={lastValidRendimento}
          investitoMeseCorrente={investitoMeseCorrente}
          portafoglioStimatoAttuale={portafoglioStimatoAttuale}
          contributoMeseCorrente={contributoMeseCorrente}
        />
      )}

      {/* TAB 1.5: Rendimenti */}
      {activeTab === 'rendimenti' && (
        <Rendimenti
          localRendimenti={localRendimenti}
          activeRendimenti={activeRendimenti}
          CRUSCOTTO_GENERALE={CRUSCOTTO_GENERALE}
          globalSelectedYear={globalSelectedYear}
          lastValidRendimento={lastValidRendimento}
          globalInspectorRecord={globalInspectorRecord}
          cruscottoRows={cruscottoRows}
          formatEuro={formatEuro}
          formatPercent={formatPercent}
          investitoMeseCorrente={investitoMeseCorrente}
          portafoglioStimatoAttuale={portafoglioStimatoAttuale}
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
