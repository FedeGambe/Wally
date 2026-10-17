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
//  1. PanoramicaRendicontoWidget — "Questo mese", con l'ancora spendibile in testa
//  2. PanoramicaWealthCards — 4 card di patrimonio (Disponibile/Investito/Accantonato/Totale libero)
//  3. PanoramicaMeseCorrenteStrip — KPI del mese con soglie e delta % vs mese precedente (da md)
//  4. PanoramicaTrendChart — grafico ad area Risparmio/Investito, mensile o cumulato
//  5. PanoramicaBilancioStorico — tabella storica mensile (su telefono in un popup)
//  6. Drawer laterale con il dettaglio movimenti quando si apre un mese
//
// Su telefono l'ordine non è quello del codice: lo decidono le classi order-*
// (mese, poi movimenti dalla banca, poi patrimonio, consumi, grafico); da md in
// su order-none rimette l'ordine del codice. Da lg la pagina è una griglia a 3
// colonne: "Questo mese" a sinistra, a destra una colonna con le card patrimonio
// in 2×2 e sotto "Dalla banca"; tutto il resto a tutta larghezza (lg:col-span-3).
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

  return (
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-3">
      <h1 className="sr-only">Panoramica</h1>
      {/* Su telefono il "+" apre i pallini dei tipi, su desktop il popup con la griglia */}
      {isPhone ? (
        <AggiungiDatoBubbles theme={theme} onScegli={(tipo) => { setTipoDaPallini(tipo); setShowAddDataModal(true); }} />
      ) : (
        <FloatingAddButton label="Aggiungi Dato" colorClass="bg-blue-600 hover:bg-blue-700" onClick={() => { setTipoDaPallini(null); setShowAddDataModal(true); }} />
      )}

      {/* "Questo mese": prima card su telefono; da lg a sinistra, alta quanto
          la colonna di destra */}
      <div className="order-1 md:order-none">
        <PanoramicaRendicontoWidget
          currentMonthData={currentMonthData}
          sogliaRisparmio={dynamicThresholds.risparmio}
          spendibileResiduo={spendibileResiduo}
          onOpenDetail={() => handleOpenMonthDetail(currentMonthData.mese, currentMonthData.anno)}
        />
      </div>

      {/* Patrimonio + "Dalla banca" in una colonna: su telefono prima la banca
          (order-1) poi il patrimonio, da md il contrario. Da lg è la colonna di
          destra: le card patrimonio crescono (flex-1) fino all'altezza di "Questo
          mese" quando la banca è corta o assente. */}
      <div className="order-2 md:order-none lg:col-span-2 flex flex-col gap-6">
        <div className="order-2 md:order-1 lg:flex-1">
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
        <div className="order-1 md:order-2 empty:hidden">
          <MovimentiBancaCard />
        </div>
      </div>

      {/* Analisi consumi: su telefono non sta nella barra in basso, si apre da qui */}
      {setActiveView && (
        <div className="order-4 md:hidden">
          <PanoramicaConsumiCard onOpen={() => setActiveView('consumi')} />
        </div>
      )}

      {/* Striscia del mese con le soglie: solo da md (su telefono la copre
          "Questo mese" con il suo dettaglio). Il wrapper è nascosto come la
          striscia, altrimenti su telefono conterebbe nel gap del flex. */}
      <div className="hidden md:block lg:col-span-3">
      <PanoramicaMeseCorrenteStrip
        currentMonthData={currentMonthData}
        prevMonthData={prevMonthData}
        dynamicThresholds={dynamicThresholds}
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
      </div>

      {/* Trend Risparmio a tutta larghezza (la card "Disponibilità Netta" che
          gli stava accanto ripeteva le cifre della striscia) */}
      <div className="order-5 md:order-none lg:col-span-3">
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
      </div>

      {/* Flusso del Mese (Sankey): solo desktop, su schermo stretto è illeggibile */}
      <div className="hidden md:block lg:col-span-3">
        <PanoramicaFunnelChart
          data={financeData}
          mese={currentMonthData.mese}
          anno={currentMonthData.anno}
          theme={theme}
        />
      </div>

      {/* Su telefono lo storico si apre da "Storico mesi" nel grafico */}
      <div className="hidden md:block lg:col-span-3">
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
