import React from 'react';
import CruscottoInspectorWidget from '../components/investimenti/CruscottoInspectorWidget';
import CruscottoKpiGroups from '../components/investimenti/CruscottoKpiGroups';
import CruscottoAssetAllocationCard from '../components/investimenti/CruscottoAssetAllocationCard';
import CruscottoInvestmentTrendChart from '../components/investimenti/CruscottoInvestmentTrendChart';
import CruscottoAssetClassTable from '../components/investimenti/CruscottoAssetClassTable';

// Sotto-vista "Cruscotto Generale" della pagina Investimenti: è la panoramica
// riassuntiva di tutto il portafoglio investimenti (Scalable + Trade Republic insieme).
// Dati usati: CRUSCOTTO_GENERALE (totali cumulati di sempre), CRUSCOTTO_ANNO (totali
// dell'anno selezionato), cruscottoRows (uno storico riga-per-anno) e nestedPieData
// (aggregazione asset class/strumenti calcolata da src/utils/cruscottoInvestimenti.ts).
// Questo file compone solo la pagina; ogni sezione vive nel proprio componente:
//  - CruscottoKpiGroups: 4 KPI card (Portafoglio Attuale, Plusvalenza Cumulata, Rendimento Anno, Contributo Anno)
//  - CruscottoInspectorWidget: dettaglio del mese selezionato (renderizzato 2 volte, mobile+desktop)
//  - CruscottoAssetAllocationCard: torta annidata asset class/strumenti + drawer dettaglio
//  - CruscottoInvestmentTrendChart: grafico ad area "Investito vs Valore Portafoglio"
//  - CruscottoAssetClassTable: tabella "Distribuzione Asset Class per Anno"
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
  selectedMacroCategories: Array<'Azioni' | 'Obbligazioni' | 'Monetari'>;
  setSelectedMacroCategories: (cats: Array<'Azioni' | 'Obbligazioni' | 'Monetari'>) => void;
  filteredDetailData: any[];
  timeRange: 'storico' | '12mesi';
  setTimeRange: (range: 'storico' | '12mesi') => void;
  chartData: any[];
  localRendimenti: any[];
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
  selectedMacroCategories,
  setSelectedMacroCategories,
  filteredDetailData,
  timeRange,
  setTimeRange,
  chartData,
  localRendimenti,
  globalInspectorRecord,
  cruscottoRows,
  formatEuro,
  formatPercent,
  lastValidRendimento,
}: CruscottoGeneraleProps) {
  return (
    <div className="space-y-6 text-left animate-fadeIn">
      <CruscottoKpiGroups
        CRUSCOTTO_GENERALE={CRUSCOTTO_GENERALE}
        CRUSCOTTO_ANNO={CRUSCOTTO_ANNO}
        calculatedRendimentoAnnuo={calculatedRendimentoAnnuo}
        elapsedMonthsForSelectedYear={elapsedMonthsForSelectedYear}
        globalSelectedYear={globalSelectedYear}
        cruscottoRows={cruscottoRows}
        formatEuro={formatEuro}
        formatPercent={formatPercent}
        lastValidRendimento={lastValidRendimento}
      />

      {/* Filtro Mese Selezionato: solo mobile, subito dopo i 4 KPI card in alto (su desktop resta in fondo, vedi sotto) */}
      <div className="lg:hidden bg-slate-50 p-6 rounded-3xl border border-slate-200 flex flex-col justify-between transition-all duration-300 hover:shadow-md">
        <CruscottoInspectorWidget record={globalInspectorRecord} formatEuro={formatEuro} formatPercent={formatPercent} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CruscottoAssetAllocationCard
          nestedPieData={nestedPieData}
          totalAssetAllocation={totalAssetAllocation}
          selectedMacroCategories={selectedMacroCategories}
          setSelectedMacroCategories={setSelectedMacroCategories}
          filteredDetailData={filteredDetailData}
          formatEuro={formatEuro}
        />

        <CruscottoInvestmentTrendChart
          chartData={chartData}
          localRendimenti={localRendimenti}
          timeRange={timeRange}
          setTimeRange={setTimeRange}
          formatEuro={formatEuro}
        />
      </div>

      {/* Grid containing Monthly returns inspector card on the left, and Distribuzione Asset Class table on the right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
        {/* Left Column: Inspector widget (desktop only qui, su mobile è duplicato subito dopo i KPI in alto) */}
        <div className="hidden lg:flex lg:col-span-1 bg-slate-50 p-6 rounded-3xl border border-slate-200 flex-col justify-between transition-all duration-300 hover:shadow-md">
          <CruscottoInspectorWidget record={globalInspectorRecord} formatEuro={formatEuro} formatPercent={formatPercent} />
        </div>

        <CruscottoAssetClassTable cruscottoRows={cruscottoRows} formatEuro={formatEuro} />
      </div>
    </div>
  );
}
