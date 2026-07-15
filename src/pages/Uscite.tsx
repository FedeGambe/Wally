// ============================================================================
// Pagina "Uscite": mostra le spese (uscite) del mese/anno selezionati,
// distinte in "primarie" (essenziali) e "secondarie" (discrezionali), con
// filtri per categoria, conto e ricerca testuale sull'elenco transazioni.
//
// Dati: i calcoli (percentuali su entrate, soglie di allerta dinamiche,
// storico ultimi 12 mesi, distribuzione per macro/micro categoria, elenco
// filtrato) sono tutti nell'hook useUsciteData (src/hooks/useUsciteData.ts).
// Questo file compone la pagina a partire dai sottocomponenti di presentazione
// (KPI, grafico storico, torte categoria, tabella) e gestisce solo un piccolo
// stato locale di UI (scroll/evidenziazione del pannello Micro Categoria).
//
// Sotto-sezioni della pagina:
//  1. UsciteKpiCards: tre card KPI (Spese Totali, Primarie, Secondarie)
//  2. UsciteTrendChart: grafico ad area con lo storico spese ultimi 12 mesi
//  3. CategoryPieCard x2: distribuzione per Macro Categoria e Micro Categoria
//     (cliccare una fetta della Macro filtra la Micro, vedi useEffect sotto)
//  4. Tabella/archivio transazioni con ricerca e filtri (macro, conto, tipo)
//  5. Drawer laterale con il dettaglio movimenti quando si apre un mese
// ============================================================================
import React, { useEffect, useRef, useState } from 'react';
import {
  Filter,
  Search,
  Grid,
  CreditCard,
  Plus
} from 'lucide-react';
import Drawer from '../components/Drawer';
import DropdownMenu from '../components/DropdownMenu';
import Modal from '../components/Modal';
import CategoryPieCard from '../components/uscite/CategoryPieCard';
import UsciteKpiCards from '../components/uscite/UsciteKpiCards';
import UsciteTrendChart from '../components/uscite/UsciteTrendChart';
import AggiungiUscitaForm from '../components/uscite/AggiungiUscitaForm';
import { formatEuro } from '../utils/format';
import { useUsciteData } from '../hooks/useUsciteData';

interface UsciteProps {
  selectedYear: string;
  setSelectedYear: (year: string) => void;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
}

export default function Uscite({
  selectedYear,
  setSelectedYear,
  selectedMonth,
  setSelectedMonth
}: UsciteProps) {
  const {
    localSelectedMonth,
    searchTerm, setSearchTerm,
    selectedMacroCat, setSelectedMacroCat,
    selectedMicroCat, setSelectedMicroCat,
    selectedConto, setSelectedConto,
    selectedType, setSelectedType,
    activeChartFilter, setActiveChartFilter,
    drawerOpen, setDrawerOpen,
    drawerTitle, drawerSubtitle, drawerTransactions, drawerStats,
    SECTOR_COLORS,
    selectedRecord, prevRecord,
    totalPctOfIncome, primaryPctOfIncome, secondaryPctOfIncome,
    dynamicThresholds,
    rolling12MonthsData,
    macroCategoriesList, accountsList,
    finalFilteredTransactions,
    macroCategoryDistribution, microCategoryDistribution,
    handleChartClick, handleOpenMonthDetail
  } = useUsciteData(selectedYear, setSelectedYear, selectedMonth, setSelectedMonth);

  // Selezionare una fetta nella torta Macro porta il focus (scroll + ring) sulla torta Micro,
  // che si aggiorna già filtrata sulla macro categoria scelta.
  const microPanelRef = useRef<HTMLDivElement>(null);
  const [microFocused, setMicroFocused] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    if (selectedMacroCat === 'Tutte') return;
    microPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    setMicroFocused(true);
    const timer = setTimeout(() => setMicroFocused(false), 1400);
    return () => clearTimeout(timer);
  }, [selectedMacroCat]);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-orange-700 hover:bg-orange-800 text-white text-sm font-bold rounded-xl transition-all cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4" /> Aggiungi Uscita
        </button>
      </div>

      <UsciteKpiCards
        selectedRecord={selectedRecord}
        prevRecord={prevRecord}
        activeChartFilter={activeChartFilter}
        setActiveChartFilter={setActiveChartFilter}
        totalPctOfIncome={totalPctOfIncome}
        primaryPctOfIncome={primaryPctOfIncome}
        secondaryPctOfIncome={secondaryPctOfIncome}
        dynamicThresholds={dynamicThresholds}
      />

      {/* Monthly expense distribution stacked lines */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm text-left transition-all duration-300 hover:shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-slate-800 font-display text-base">
                Andamento Spese {selectedMacroCat !== 'Tutte' ? `: ${selectedMacroCat}` : ''} {selectedMicroCat !== 'Tutte' ? `> ${selectedMicroCat}` : ''} (Ultimi 12 Mesi)
              </h3>
              {(selectedMacroCat !== 'Tutte' || selectedMicroCat !== 'Tutte') && (
                <button
                  onClick={() => {
                    setSelectedMacroCat('Tutte');
                    setSelectedMicroCat('Tutte');
                  }}
                  className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] px-2 py-0.5 rounded-full font-bold transition flex items-center gap-1 cursor-pointer"
                  title="Azzera filtri categoria"
                >
                  <span>Ripristina Totale</span>
                  <span className="font-extrabold">×</span>
                </button>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {selectedMacroCat !== 'Tutte' || selectedMicroCat !== 'Tutte'
                ? `Mostrato il dettaglio storico per ${selectedMacroCat !== 'Tutte' ? `Macro: ${selectedMacroCat}` : ''} ${selectedMicroCat !== 'Tutte' ? `• Micro: ${selectedMicroCat}` : ''}.`
                : "Confronto temporale tra primarie e secondarie."
              } Clicca sul grafico per selezionare il mese di <strong className="text-orange-600 uppercase font-bold">{localSelectedMonth}</strong>.
            </p>
          </div>
          {/* Action button to open details */}
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline bg-orange-50 px-3 py-1.5 rounded-full text-xs font-bold text-orange-700 capitalize">
              Attivo: {localSelectedMonth} {selectedRecord.anno}
            </span>
            <button
              onClick={() => handleOpenMonthDetail(localSelectedMonth, selectedRecord.anno)}
              className="bg-orange-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition hover:bg-orange-800 cursor-pointer text-center"
            >
              Vedi Transazioni
            </button>
          </div>
        </div>
        <UsciteTrendChart
          rolling12MonthsData={rolling12MonthsData}
          activeChartFilter={activeChartFilter}
          localSelectedMonth={localSelectedMonth}
          handleChartClick={handleChartClick}
        />
      </div>

      {/* Split grid of distributions (Macro Categories & Icons Used) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CategoryPieCard
          icon={Grid}
          title="Spese per Macro Categoria"
          subtitle="Sottodivisione in base alle voci principali in euro"
          data={macroCategoryDistribution}
          colors={SECTOR_COLORS}
          selected={selectedMacroCat}
          onSelect={setSelectedMacroCat}
        />

        <CategoryPieCard
          icon={CreditCard}
          title="Spese per Micro Categoria"
          subtitle="Sottodivisione in base alle categorie delle transazioni del mese"
          data={microCategoryDistribution}
          colors={SECTOR_COLORS}
          colorOffset={3}
          selected={selectedMicroCat}
          onSelect={setSelectedMicroCat}
          containerRef={microPanelRef}
          highlighted={microFocused}
        />
      </div>

      {/* Interactive table list filtering federico's real inputs */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm text-left transition-all duration-300 hover:shadow-md">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 intense-search-bar">
          <div>
            <h3 className="font-bold text-slate-800 font-display text-base">Archivio Transazioni Uscite</h3>
            <p className="text-xs text-slate-400 mt-1">Cerca, filtra e analizza i flussi in tempo reale</p>
          </div>

          {/* Quick search input */}
          <div className="flex items-center gap-2.5 relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5" />
            <input
              type="text"
              placeholder="Cerca transazione, desc, cat..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-xs font-medium focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Table filters strip */}
        <div className="flex flex-wrap items-center gap-3 bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs text-slate-500 mb-4 font-medium select-none">
          <div className="flex items-center gap-1.5 shrink-0">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Filtri attivi:</span>
          </div>

          {/* macro category selector */}
          <DropdownMenu
            icon={Grid}
            accent="orange"
            widthClass="w-56"
            label="Macro"
            value={selectedMacroCat}
            displayValue={selectedMacroCat}
            options={macroCategoriesList}
            onSelect={(m) => {
              setSelectedMacroCat(m);
              setSelectedMicroCat('Tutte');
            }}
            getOptionLabel={(m) => (m === 'Tutte' ? 'Macro Categorie (Tutte)' : m)}
          />

          {/* payment account selector */}
          <DropdownMenu
            icon={CreditCard}
            accent="orange"
            widthClass="w-56"
            label="Conto"
            value={selectedConto}
            displayValue={selectedConto}
            options={accountsList}
            onSelect={setSelectedConto}
            getOptionLabel={(a) => (a === 'Tutti' ? 'Conto Utilizzato (Tutti)' : a)}
          />

          {/* primary / secondary checklist switcher */}
          <DropdownMenu
            icon={Filter}
            accent="orange"
            widthClass="w-56"
            label="Tipologia"
            value={selectedType}
            displayValue={
              selectedType === 'Primarie'
                ? 'Primarie (35%)'
                : selectedType === 'Secondarie'
                ? 'Secondarie (15%)'
                : 'Tutte'
            }
            options={['Tutte', 'Primarie', 'Secondarie']}
            onSelect={setSelectedType}
            getOptionLabel={(v) =>
              v === 'Tutte'
                ? 'Tipologia Spesa (Tutte)'
                : v === 'Primarie'
                ? 'Solo Spese Primarie (Target 35%)'
                : 'Solo Spese Secondarie (Target 15%)'
            }
          />

          {/* Micro category selection indicator */}
          {selectedMicroCat !== 'Tutte' && (
            <span className="inline-flex items-center gap-1 bg-indigo-50 border border-indigo-200 text-indigo-700 px-2.5 py-1 rounded-lg font-bold shrink-0">
              <span>Micro: {selectedMicroCat}</span>
              <button
                onClick={() => setSelectedMicroCat('Tutte')}
                className="hover:text-indigo-900 font-extrabold ml-1.5 cursor-pointer text-sm leading-none"
                title="Rimuovi filtro micro categoria"
              >
                ×
              </button>
            </span>
          )}

          <span className="text-[10px] text-slate-450 ml-auto font-mono">
            Mostrati: <strong className="font-bold text-slate-700">{finalFilteredTransactions.length}</strong> record
          </span>
        </div>

        {/* Transactions list layout table */}
        {finalFilteredTransactions.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
            Nessuna transazione soddisfa i filtri selezionati.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Data</th>
                  <th className="py-3 px-4">Descrizione</th>
                  <th className="py-3 px-4">Macro</th>
                  <th className="py-3 px-4">Categoria</th>
                  <th className="py-3 px-4 text-right">Importo</th>
                  <th className="py-3 px-4">Conto utilizzato</th>
                  <th className="py-3 px-4 text-center">Primaria</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs">
                {finalFilteredTransactions.map((tx, idx) => (
                  <tr key={tx.id || `tx-${idx}`} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 text-slate-400 font-normal font-mono">
                      {tx.data}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="shrink-0">{tx.icon || '🍕'}</span>
                        <span className="font-semibold text-slate-800 truncate max-w-xs">{tx.descrizione}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="bg-slate-100 border border-slate-200/50 text-[10px] text-slate-600 px-2 py-0.5 rounded-md font-bold uppercase tracking-wide">
                        {tx.macroCategoria}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 font-normal">
                      {tx.categoria}
                    </td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-slate-800 font-mono">
                      {formatEuro(tx.importo)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded text-[10px] text-slate-600 font-mono">
                        {tx.conto}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {tx.primaria ? (
                        <span className="inline-flex items-center bg-orange-700 text-white text-[9px] font-bold uppercase px-2 py-0.5 rounded-sm">
                          Sì (35%)
                        </span>
                      ) : (
                        <span className="inline-flex items-center bg-orange-100 text-orange-700 text-[9px] font-bold uppercase px-2 py-0.5 rounded-sm">
                          No (15%)
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={drawerTitle}
        subtitle={drawerSubtitle}
        transactions={drawerTransactions}
        stats={drawerStats}
      />

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Aggiungi Uscita">
        <AggiungiUscitaForm onSaved={() => setShowAddModal(false)} />
      </Modal>
    </div>
  );
}
