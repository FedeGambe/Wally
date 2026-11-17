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
//  4. UsciteTransazioniTable: archivio del mese, dal più recente, con
//     ordinamento per colonna e un filtro per ogni colonna
//  5. Drawer laterale con il dettaglio movimenti quando si apre un mese
// La scheda "Analisi periodo" (subviews/AnalisiUscite.tsx) mostra invece le
// uscite su un periodo intero (anno, ultimi 12 mesi, tutto, da/a).
// ============================================================================
import React, { useEffect, useRef, useState } from 'react';
import { Search, Grid, CreditCard, ZoomIn, ZoomOut, CalendarDays, ChartColumn } from 'lucide-react';
import Drawer from '../components/Drawer';
import BarraSchede from '../components/BarraSchede';
import Modal from '../components/Modal';
import FloatingAddButton from '../components/FloatingAddButton';
import CategoryPieCard from '../components/uscite/CategoryPieCard';
import UsciteKpiCards from '../components/uscite/UsciteKpiCards';
import UsciteTrendChart, { scalaAsseUscite } from '../components/uscite/UsciteTrendChart';
import AggiungiUscitaForm from '../components/uscite/AggiungiUscitaForm';
import UsciteTransazioniTable from '../components/uscite/UsciteTransazioniTable';
import AnalisiUscite from '../subviews/AnalisiUscite';
import { useUsciteData } from '../hooks/useUsciteData';
import { FILTRI_USCITE_VUOTI, FiltriUscite } from '../utils/filtriUscite';

/** Scheda di Uscite: il mese scelto nell'header, o l'analisi su un periodo intero. */
export type UsciteScheda = 'mese' | 'analisi';

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
    activeChartFilter, setActiveChartFilter,
    drawerOpen, setDrawerOpen,
    drawerTitle, drawerSubtitle, drawerTransactions, drawerStats,
    SECTOR_COLORS,
    selectedRecord, prevRecord,
    totalPctOfIncome, primaryPctOfIncome, secondaryPctOfIncome,
    dynamicThresholds,
    rolling12MonthsData,
    activeMonthAllTransactions,
    macroCategoryDistribution, microCategoryDistribution,
    handleChartClick, handleOpenMonthDetail
  } = useUsciteData(selectedYear, setSelectedYear, selectedMonth, setSelectedMonth);

  // Selezionare una fetta nella torta Macro porta il focus (scroll + ring) sulla torta Micro,
  // che si aggiorna già filtrata sulla macro categoria scelta.
  const microPanelRef = useRef<HTMLDivElement>(null);
  const [microFocused, setMicroFocused] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [zoomedOut, setZoomedOut] = useState(false);
  const { hasOutliers } = scalaAsseUscite(rolling12MonthsData, activeChartFilter);
  const [scheda, setScheda] = useState<UsciteScheda>('mese');

  // Filtri di colonna dell'archivio: macro, categoria e testo vivono nell'hook
  // (li usano anche grafico e torte), gli altri solo qui.
  const [filtriColonne, setFiltriColonne] = useState<FiltriUscite>(FILTRI_USCITE_VUOTI);
  const filtriTabella: FiltriUscite = {
    ...filtriColonne,
    macro: selectedMacroCat === 'Tutte' ? '' : selectedMacroCat,
    categoria: selectedMicroCat === 'Tutte' ? '' : selectedMicroCat,
    testo: searchTerm
  };

  useEffect(() => {
    if (selectedMacroCat === 'Tutte') return;
    microPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    setMicroFocused(true);
    const timer = setTimeout(() => setMicroFocused(false), 1400);
    return () => clearTimeout(timer);
  }, [selectedMacroCat]);

  return (
    <div className="space-y-6">
      <h1 className="sr-only">Uscite</h1>
      <FloatingAddButton label="Aggiungi Uscita" colorClass="bg-orange-700 hover:bg-orange-800" onClick={() => setShowAddModal(true)} />

      <BarraSchede
        ariaLabel="Sezioni di Uscite"
        compatta={false}
        accento="#ea580c"
        fissa
        attiva={scheda}
        onChange={setScheda}
        schede={[
          { id: 'mese', etichetta: `${localSelectedMonth.charAt(0).toUpperCase()}${localSelectedMonth.slice(1)} ${selectedRecord.anno}`, icona: <CalendarDays className="w-[18px] h-[18px]" /> },
          { id: 'analisi', etichetta: 'Analisi periodo', icona: <ChartColumn className="w-[18px] h-[18px]" /> }
        ]}
      />

      {scheda === 'analisi' ? (
        <AnalisiUscite />
      ) : (
      <>
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
      <div className="bg-white p-6 rounded-3xl border border-hairline shadow-sm text-left transition-all duration-300 hover:shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-bold text-ink font-display text-base">
                {['Andamento spese', selectedMacroCat !== 'Tutte' ? selectedMacroCat : null, selectedMicroCat !== 'Tutte' ? selectedMicroCat : null].filter(Boolean).join(' · ')}
              </h2>
              {(selectedMacroCat !== 'Tutte' || selectedMicroCat !== 'Tutte') && (
                <button
                  onClick={() => {
                    setSelectedMacroCat('Tutte');
                    setSelectedMicroCat('Tutte');
                  }}
                  className="bg-orange-500/10 hover:bg-orange-500/20 text-orange-700 dark:text-orange-300 text-3xs px-2 py-0.5 rounded-full font-bold transition flex items-center gap-1 cursor-pointer"
                  title="Azzera filtri categoria"
                >
                  <span>Ripristina Totale</span>
                  <span className="font-extrabold">×</span>
                </button>
              )}
            </div>
            <p className="text-xs text-ink-soft mt-1">
              {selectedMacroCat !== 'Tutte' || selectedMicroCat !== 'Tutte'
                ? `Dettaglio storico di ${[selectedMacroCat !== 'Tutte' ? `Macro: ${selectedMacroCat}` : null, selectedMicroCat !== 'Tutte' ? `Micro: ${selectedMicroCat}` : null].filter(Boolean).join(' · ')}.`
                : "Confronto temporale tra primarie e secondarie."
              }<span className="hidden md:inline"> Clicca sul grafico per selezionare il mese di <strong className="text-orange-600 uppercase font-bold">{localSelectedMonth}</strong>.</span>
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
            {hasOutliers && (
              <button
                onClick={() => setZoomedOut(z => !z)}
                className="ml-auto inline-flex items-center gap-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold text-xs px-3 py-2 rounded-xl transition cursor-pointer"
                title={zoomedOut ? 'Torna alla scala sulla media' : 'Mostra anche i valori molto alti'}
              >
                {zoomedOut ? <ZoomIn className="w-3.5 h-3.5" /> : <ZoomOut className="w-3.5 h-3.5" />}
                {zoomedOut ? 'Zoom in' : 'Zoom out'}
              </button>
            )}
          </div>
        </div>
        <UsciteTrendChart
          rolling12MonthsData={rolling12MonthsData}
          activeChartFilter={activeChartFilter}
          localSelectedMonth={localSelectedMonth}
          handleChartClick={handleChartClick}
          zoomedOut={zoomedOut}
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

      {/* Archivio del mese: ordinamento e filtri per colonna (macro e categoria
          sono gli stessi delle torte sopra, il testo è la ricerca qui accanto) */}
      <div className="bg-white p-6 rounded-3xl border border-hairline shadow-sm text-left transition-all duration-300 hover:shadow-md">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5 intense-search-bar">
          <div>
            <h2 className="font-bold text-ink font-display text-base">Archivio Transazioni Uscite</h2>
            <p className="text-xs text-ink-soft mt-1">
              Movimenti di {localSelectedMonth} {selectedRecord.anno}, dal più recente. Per un periodo più lungo usa{' '}
              <button type="button" onClick={() => setScheda('analisi')} className="font-bold text-orange-700 dark:text-orange-300 hover:underline cursor-pointer">Analisi</button>.
            </p>
          </div>

          <div className="flex items-center gap-2.5 relative w-full md:w-80">
            <Search className="w-4 h-4 text-ink-soft absolute left-3.5" />
            <input
              type="search"
              aria-label="Cerca nelle transazioni del mese"
              placeholder="Cerca transazione, desc, cat..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-canvas border border-hairline rounded-xl py-2 pl-10 pr-4 text-xs font-medium focus:outline-hidden focus:ring-1 focus:ring-orange-500"
            />
          </div>
        </div>

        <UsciteTransazioniTable
          transazioni={activeMonthAllTransactions}
          filtri={filtriTabella}
          onFiltriChange={(f) => {
            setFiltriColonne(f);
            setSelectedMacroCat(f.macro || 'Tutte');
            setSelectedMicroCat(f.categoria || 'Tutte');
            setSearchTerm(f.testo);
          }}
          soglie={dynamicThresholds}
        />
      </div>

      </>
      )}

      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={drawerTitle}
        subtitle={drawerSubtitle}
        transactions={drawerTransactions}
        stats={drawerStats}
      />

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Aggiungi Uscita" fullScreenOnMobile>
        <AggiungiUscitaForm onSaved={() => setShowAddModal(false)} />
      </Modal>
    </div>
  );
}
