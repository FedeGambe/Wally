// ============================================================================
// Pagina "Panoramica": è la dashboard riassuntiva mostrata come prima
// schermata, con la fotografia del patrimonio e l'andamento mensile di
// entrate/uscite/risparmio/investimenti per il mese/anno selezionati.
//
// Dati: tutti i calcoli (totali di patrimonio, percentuali sul mese, delta
// vs mese precedente, serie storica per il grafico) vengono dall'hook
// usePanoramicaData (src/hooks/usePanoramicaData.ts). Qui c'è solo la
// composizione delle sezioni, ciascuna un componente in
// src/components/panoramica/:
//  1. PanoramicaWealthCards — 4 card di patrimonio (Disponibile/Investito/Accantonato/Totale)
//  2. PanoramicaRendicontoWidget — "Disponibilità Netta", renderizzato 2 volte
//     (mobile in alto, desktop accanto al grafico) a seconda del breakpoint
//  3. PanoramicaMeseCorrenteStrip — KPI del mese con soglie e delta % vs mese precedente
//  4. PanoramicaTrendChart — grafico ad area Risparmio/Investito, mensile o cumulato
//  5. PanoramicaBilancioStorico — tabella storica mensile
//  6. Drawer laterale con il dettaglio movimenti quando si apre un mese
// ============================================================================
import React, { useState } from 'react';
import { useIsMobile } from '../hooks/useIsMobile';
import { Plus } from 'lucide-react';
import AggiungiDatoModal from '../components/AggiungiDatoModal';
import Drawer from '../components/Drawer';
import PanoramicaWealthCards from '../components/panoramica/PanoramicaWealthCards';
import PanoramicaRendicontoWidget from '../components/panoramica/PanoramicaRendicontoWidget';
import PanoramicaMeseCorrenteStrip from '../components/panoramica/PanoramicaMeseCorrenteStrip';
import PanoramicaTrendChart from '../components/panoramica/PanoramicaTrendChart';
import PanoramicaBilancioStorico from '../components/panoramica/PanoramicaBilancioStorico';
import { usePanoramicaData } from '../hooks/usePanoramicaData';

interface PanoramicaProps {
  selectedYear: string;
  setSelectedYear: (year: string) => void;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  setActiveView?: (view: string) => void;
}

export default function Panoramica({
  selectedYear,
  setSelectedYear,
  selectedMonth,
  setSelectedMonth,
  setActiveView
}: PanoramicaProps) {
  const isMobile = useIsMobile();
  const {
    localSelectedMonth,
    drawerOpen, setDrawerOpen,
    drawerTitle, drawerSubtitle, drawerTransactions, drawerStats,
    filteredRisparmio,
    chartData,
    cumulativeChartData,
    dynamicThresholds,
    currentMonthData, prevMonthData,
    patrimonioTotale, capitaleDisponibile, capitaleInvestito, capitaleImpegnato,
    handleChartClick, handleOpenMonthDetail,
    entrateDelta, speseDelta, spesePrimDelta, speseSecDelta,
    primPerc, secPerc, invPerc, rispPerc, spendibileResiduo
  } = usePanoramicaData(selectedYear, setSelectedYear, selectedMonth, setSelectedMonth);

  const [showAddDataModal, setShowAddDataModal] = useState(false);

  const rendicontoWidget = (
    <PanoramicaRendicontoWidget
      currentMonthData={currentMonthData}
      sogliaRisparmio={dynamicThresholds.risparmio}
      isMobile={isMobile}
      onOpenDetail={() => handleOpenMonthDetail(currentMonthData.mese, currentMonthData.anno)}
    />
  );

  return (
    <div className="space-y-6">
      <h1 className="sr-only">Panoramica</h1>
      <div className="flex justify-end">
        <button
          onClick={() => setShowAddDataModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4" /> Aggiungi Dato
        </button>
      </div>

      <PanoramicaWealthCards
        capitaleDisponibile={capitaleDisponibile}
        capitaleInvestito={capitaleInvestito}
        capitaleImpegnato={capitaleImpegnato}
        patrimonioTotale={patrimonioTotale}
      />

      {/* Rendiconto Mese Corrente: solo mobile, subito dopo i 4 widget patrimonio
          (su desktop resta nella sua posizione originale, vedi sotto) */}
      <div className="md:hidden">
        {rendicontoWidget}
      </div>

      {/* Main KPI Month Strip & Indicators: nascosto su mobile, il suo contenuto
          è già coperto dal widget "Rendiconto Mese Corrente" sopra e dal suo
          popup di dettaglio (tap sul widget -> drawer con lo stesso mese) */}
      <PanoramicaMeseCorrenteStrip
        currentMonthData={currentMonthData}
        prevMonthData={prevMonthData}
        dynamicThresholds={dynamicThresholds}
        spendibileResiduo={spendibileResiduo}
        primPerc={primPerc}
        secPerc={secPerc}
        invPerc={invPerc}
        rispPerc={rispPerc}
        entrateDelta={entrateDelta}
        speseDelta={speseDelta}
        spesePrimDelta={spesePrimDelta}
        speseSecDelta={speseSecDelta}
        setActiveView={setActiveView}
      />

      {/* Line Chart & General Status Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <PanoramicaTrendChart
          chartData={chartData}
          cumulativeChartData={cumulativeChartData}
          localSelectedMonth={localSelectedMonth}
          selectedYear={selectedYear}
          isMobile={isMobile}
          handleChartClick={handleChartClick}
          handleOpenMonthDetail={handleOpenMonthDetail}
        />

        {/* Status Summary Widget: solo desktop qui, su mobile è duplicato subito dopo i 4 widget patrimonio in alto */}
        <div className="hidden md:block">
          {rendicontoWidget}
        </div>
      </div>

      <PanoramicaBilancioStorico
        filteredRisparmio={filteredRisparmio}
        dynamicThresholds={dynamicThresholds}
        handleOpenMonthDetail={handleOpenMonthDetail}
      />

      {/* Drawer detailed details */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={drawerTitle}
        subtitle={drawerSubtitle}
        transactions={drawerTransactions}
        stats={drawerStats}
        dynamicThresholds={dynamicThresholds}
      />

      <AggiungiDatoModal isOpen={showAddDataModal} onClose={() => setShowAddDataModal(false)} />
    </div>
  );
}
