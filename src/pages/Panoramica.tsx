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
//  2. PanoramicaRendicontoWidget — renderizzato 2 volte: "Questo mese" in cima
//     su telefono, "Disponibilità Netta" accanto al grafico su computer
//  3. PanoramicaMeseCorrenteStrip — KPI del mese con soglie e delta % vs mese precedente
//  4. PanoramicaTrendChart — grafico ad area Risparmio/Investito, mensile o cumulato
//  5. PanoramicaBilancioStorico — tabella storica mensile (su telefono in un popup)
//  6. Drawer laterale con il dettaglio movimenti quando si apre un mese
//
// Su telefono l'ordine non è quello del codice: lo decidono le classi order-*
// (mese, poi movimenti dalla banca, poi patrimonio, consumi, grafico); da md in
// su order-none rimette l'ordine del codice, che è quello del computer.
// ============================================================================
import React, { useState } from 'react';
import { useIsMobile } from '../hooks/useIsMobile';
import AggiungiDatoModal, { type TipoDato } from '../components/AggiungiDatoModal';
import AggiungiDatoBubbles from '../components/AggiungiDatoBubbles';
import FloatingAddButton from '../components/FloatingAddButton';
import Drawer from '../components/Drawer';
import Modal from '../components/Modal';
import PanoramicaWealthCards from '../components/panoramica/PanoramicaWealthCards';
import PanoramicaRendicontoWidget from '../components/panoramica/PanoramicaRendicontoWidget';
import PanoramicaMeseCorrenteStrip from '../components/panoramica/PanoramicaMeseCorrenteStrip';
import PanoramicaTrendChart from '../components/panoramica/PanoramicaTrendChart';
import PanoramicaFunnelChart from '../components/panoramica/PanoramicaFunnelChart';
import PanoramicaBilancioStorico from '../components/panoramica/PanoramicaBilancioStorico';
import { usePanoramicaData } from '../hooks/usePanoramicaData';
import { useFinanceData } from '../context/FinanceDataContext';
import MovimentiBancaCard from '../components/banca/MovimentiBancaCard';
import PanoramicaConsumiCard from '../components/panoramica/PanoramicaConsumiCard';

interface PanoramicaProps {
  selectedYear: string;
  setSelectedYear: (year: string) => void;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  setActiveView?: (view: string) => void;
  theme: 'dark' | 'light';
}

export default function Panoramica({
  selectedYear,
  setSelectedYear,
  selectedMonth,
  setSelectedMonth,
  setActiveView,
  theme
}: PanoramicaProps) {
  const isMobile = useIsMobile();
  const { data: financeData } = useFinanceData();
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
  // Tipo scelto dai pallini (solo telefono); null = popup con la griglia (desktop).
  const [tipoDaPallini, setTipoDaPallini] = useState<TipoDato>(null);
  const isPhone = useIsMobile(768);
  // Popup "Storico mesi": su telefono la tabella storica non sta nella Home.
  const [storicoAperto, setStoricoAperto] = useState(false);

  const rendicontoWidget = (variante: 'telefono' | 'computer') => (
    <PanoramicaRendicontoWidget
      currentMonthData={currentMonthData}
      sogliaRisparmio={dynamicThresholds.risparmio}
      spendibileResiduo={spendibileResiduo}
      variante={variante}
      onOpenDetail={() => handleOpenMonthDetail(currentMonthData.mese, currentMonthData.anno)}
    />
  );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="sr-only">Panoramica</h1>
      {/* Su telefono il "+" apre i pallini dei tipi, su desktop il popup con la griglia */}
      {isPhone ? (
        <AggiungiDatoBubbles theme={theme} onScegli={(tipo) => { setTipoDaPallini(tipo); setShowAddDataModal(true); }} />
      ) : (
        <FloatingAddButton label="Aggiungi Dato" colorClass="bg-blue-600 hover:bg-blue-700" onClick={() => { setTipoDaPallini(null); setShowAddDataModal(true); }} />
      )}

      <div className="order-3 md:order-none">
        <PanoramicaWealthCards
          capitaleDisponibile={capitaleDisponibile}
          capitaleInvestito={capitaleInvestito}
          capitaleImpegnato={capitaleImpegnato}
          patrimonioTotale={patrimonioTotale}
        />
      </div>

      {/* Movimenti scaricati dalle banche: compare solo con una banca collegata.
          Il wrapper vuoto non lascia spazi: in un flex con gap un div vuoto conta,
          per questo :empty lo nasconde. */}
      <div className="order-2 md:order-none empty:hidden">
        <MovimentiBancaCard />
      </div>

      {/* "Questo mese": solo telefono, prima card della Home */}
      <div className="order-1 md:hidden">
        {rendicontoWidget('telefono')}
      </div>

      {/* Analisi consumi: su telefono non sta nella barra in basso, si apre da qui */}
      {setActiveView && (
        <div className="order-4 md:hidden">
          <PanoramicaConsumiCard onOpen={() => setActiveView('consumi')} />
        </div>
      )}

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
      <div className="order-5 md:order-none grid grid-cols-1 lg:grid-cols-3 gap-6">
        <PanoramicaTrendChart
          chartData={chartData}
          cumulativeChartData={cumulativeChartData}
          localSelectedMonth={localSelectedMonth}
          selectedYear={selectedYear}
          isMobile={isMobile}
          handleChartClick={handleChartClick}
          handleOpenMonthDetail={handleOpenMonthDetail}
          onApriStorico={() => setStoricoAperto(true)}
        />

        {/* Status Summary Widget: solo desktop qui, su telefono c'è "Questo mese" in cima */}
        <div className="hidden md:block">
          {rendicontoWidget('computer')}
        </div>
      </div>

      {/* Flusso del Mese (Sankey): solo desktop, su schermo stretto è illeggibile */}
      <PanoramicaFunnelChart
        data={financeData}
        mese={currentMonthData.mese}
        anno={currentMonthData.anno}
        theme={theme}
      />

      {/* Su telefono lo storico si apre da "Storico mesi" nel grafico */}
      <div className="hidden md:block">
        <PanoramicaBilancioStorico
          filteredRisparmio={filteredRisparmio}
          dynamicThresholds={dynamicThresholds}
          handleOpenMonthDetail={handleOpenMonthDetail}
        />
      </div>

      <Modal isOpen={storicoAperto} onClose={() => setStoricoAperto(false)} title="Storico mesi" fullScreenOnMobile maxWidthClass="max-w-3xl">
        {/* Il popup va in un portal fuori dal contenitore dell'app: senza
            glass-theme la tabella perde i colori del tema scuro (testo scuro su scuro) */}
        <div className={theme === 'dark' ? 'glass-theme' : undefined}>
          <PanoramicaBilancioStorico
            filteredRisparmio={filteredRisparmio}
            dynamicThresholds={dynamicThresholds}
            handleOpenMonthDetail={(mese, anno) => { setStoricoAperto(false); handleOpenMonthDetail(mese, anno); }}
            inPopup
          />
        </div>
      </Modal>

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

      <AggiungiDatoModal isOpen={showAddDataModal} onClose={() => setShowAddDataModal(false)} tipoIniziale={tipoDaPallini} />
    </div>
  );
}
