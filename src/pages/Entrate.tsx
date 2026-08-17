// ============================================================================
// Pagina "Entrate": mostra i flussi di ENTRATA (stipendio, altri introiti...)
// per il mese/anno selezionati dall'utente (filtri gestiti in App.tsx e
// passati come props selectedYear/selectedMonth).
//
// Dati: tutta la logica di calcolo (aggregazioni per categoria/conto, delta
// rispetto al mese precedente, elenco movimenti del mese) vive nell'hook
// useEntrateData (src/hooks/useEntrateData.ts). Questo file compone solo le
// sezioni, ciascuna un componente in src/components/entrate/:
//  1. EntrateBentoCards — Entrate del mese ed Entrate annuali + media mensile
//  2. EntrateTrendChart — storico mensile delle entrate (cliccabile)
//  3. EntratePieCard (x2) — ripartizione per categoria e per conto di accredito
//  4. EntrateMovimentiTable — dettaglio dei singoli movimenti del mese selezionato
//  5. Drawer laterale con l'elenco delle transazioni quando si clicca un punto
// ============================================================================
import React, { useState } from 'react';
import { useIsMobile } from '../hooks/useIsMobile';
import { Grid, CreditCard, Plus } from 'lucide-react';
import Drawer from '../components/Drawer';
import Modal from '../components/Modal';
import AggiungiEntrataForm from '../components/entrate/AggiungiEntrataForm';
import EntrateBentoCards from '../components/entrate/EntrateBentoCards';
import EntrateTrendChart from '../components/entrate/EntrateTrendChart';
import EntratePieCard from '../components/entrate/EntratePieCard';
import EntrateMovimentiTable from '../components/entrate/EntrateMovimentiTable';
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
  const isMobile = useIsMobile();
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

  const [showAddModal, setShowAddModal] = useState(false);

  return (
    <div className="space-y-6">
      <h1 className="sr-only">Entrate</h1>
      <div className="flex justify-end">
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-all cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4" /> Aggiungi Entrata
        </button>
      </div>

      <EntrateBentoCards
        selectedRecord={selectedRecord}
        prevRecord={prevRecord}
        totalIncomeForSelectedYear={totalIncomeForSelectedYear}
        avgMonthlyIncome={avgMonthlyIncome}
      />

      <EntrateTrendChart
        chartData={chartData}
        isMobile={isMobile}
        localSelectedMonth={localSelectedMonth}
        selectedRecord={selectedRecord}
        handlePointClick={handlePointClick}
      />

      {/* Grafici a Torta della Ripartizione */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EntratePieCard
          icon={Grid}
          title="Ripartizione Categoria Ricavi"
          subtitle="Suddivisione delle entrate per causale o tipologia"
          data={categoryData}
          colors={COLORS}
          emptyMessage="Nessuna entrata registrata per questo mese"
        />

        <EntratePieCard
          icon={CreditCard}
          title="Canali di Accredito"
          subtitle="Conti correnti e depositi su cui sono confluiti i capitali"
          data={accountData}
          colors={COLORS}
          colorOffset={2}
          emptyMessage="Nessun accredito registrato per questo mese"
        />
      </div>

      <EntrateMovimentiTable selectedRecord={selectedRecord} activeMonthEntries={activeMonthEntries} />

      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={drawerTitle}
        transactions={drawerTransactions}
        stats={drawerStats}
      />

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Aggiungi Entrata">
        <AggiungiEntrataForm onSaved={() => setShowAddModal(false)} />
      </Modal>
    </div>
  );
}
