/**
 * Pagina "Investimenti": contenitore con 4 schede (Cruscotto, Rendimenti, Conti, Fondo Pensione).
 * Questo file NON contiene la logica di calcolo: fa solo da "guscio" che sceglie quale sotto-vista
 * mostrare (subviews/CruscottoGenerale, Rendimenti, Conti, FondoPensione) e passa loro i dati già
 * pronti. Tutti i calcoli (asset allocation, rendimenti, KPI dei conti broker, ecc.) vivono nel
 * custom hook useInvestimentiData (src/hooks/useInvestimentiData.ts), che a sua volta si appoggia
 * a useFinanceData() e a src/utils/cruscottoInvestimenti.ts. Qui vengono solo destrutturati i
 * risultati dell'hook e smistati alla scheda attiva.
 */
import React, { useState } from 'react';
import { Repeat, Sparkles, ClipboardCheck, LayoutDashboard, TrendingUp, Landmark, PiggyBank } from 'lucide-react';
import BarraSchede from '../components/BarraSchede';
import CruscottoGenerale from '../subviews/CruscottoGenerale';
import Rendimenti from '../subviews/Rendimenti';
import Conti from '../subviews/Conti';
import FondoPensione from '../subviews/FondoPensione';
import { formatEuro } from '../utils/format';
import { useInvestimentiData } from '../hooks/useInvestimentiData';
import AggiungiDatoBubbles, { type Voce } from '../components/AggiungiDatoBubbles';
import { useIsMobile } from '../hooks/useIsMobile';
import AggiungiInvestimentoModal, { type TipoInvestimento } from '../components/investimenti/AggiungiInvestimentoModal';

// Pallini del "+" su tre posti dell'arco (dritto in su, diagonale, dritto a sinistra).
// "Verifica" e non "Verifica mensile": a sinistra, su telefoni da 360px, uscirebbe dallo schermo.
const VOCI_INVESTIMENTO: Voce<Exclude<TipoInvestimento, null>>[] = [
  { id: 'ricorrenti', label: 'Ricorrente', icon: Repeat, colorClass: 'bg-sky-500', posto: 0, tipo: 'ricorrenti' },
  { id: 'unaTantum', label: 'Una tantum', icon: Sparkles, colorClass: 'bg-sky-500', posto: 2, tipo: 'unaTantum' },
  { id: 'verifica', label: 'Verifica', icon: ClipboardCheck, colorClass: 'bg-sky-500', posto: 4, tipo: 'verifica' }
];

export type InvestimentiTab = 'cruscotto' | 'rendimenti' | 'conti' | 'pensione';

interface InvestimentiProps {
  selectedMonth?: string;
  setSelectedMonth?: (month: string) => void;
  selectedYear?: string;
  setSelectedYear?: (year: string) => void;
  theme?: 'light' | 'dark';
  /** Scheda attiva, decisa da App.tsx: su telefono la scelgono i pallini della
   *  barra in basso (MobileBottomNav) e la barra delle schede qui in alto sparisce.
   *  Senza queste props (es. nella demo) la pagina tiene la scheda per conto suo. */
  activeTab?: InvestimentiTab;
  setActiveTab?: (tab: InvestimentiTab) => void;
}

export default function Investimenti({
  // Mese/anno selezionati globalmente in App.tsx (header); i valori di default qui sotto scattano
  // solo se la pagina viene montata senza props (es. in isolamento/test), non nell'uso normale.
  selectedMonth: globalSelectedMonth = 'Luglio',
  selectedYear: globalSelectedYear = '2026',
  activeTab: activeTabProp,
  setActiveTab: setActiveTabProp,
  theme = 'light',
}: InvestimentiProps = {}) {
  const [activeTabLocale, setActiveTabLocale] = useState<InvestimentiTab>('cruscotto');
  const activeTab = activeTabProp ?? activeTabLocale;
  const setActiveTab = setActiveTabProp ?? setActiveTabLocale;

  // Tutta la logica (filtri, aggregazioni, KPI) è calcolata dall'hook: qui prendiamo solo i risultati.
  const {
    activeConto, setActiveConto,
    selectedMacroCategories, setSelectedMacroCategories,
    timeRange, setTimeRange,
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
  const [showAddModal, setShowAddModal] = useState(false);
  const [tipoDaPallini, setTipoDaPallini] = useState<TipoInvestimento>(null);
  const isPhone = useIsMobile(768);

  return (
    <div className="space-y-6">
      <h1 className="sr-only">Investimenti</h1>
      {/* Il "+" apre i pallini come nella Home; su desktop più grandi */}
      <AggiungiDatoBubbles
        theme={theme}
        grande={!isPhone}
        voci={VOCI_INVESTIMENTO}
        titolo="Aggiungi investimento"
        etichetta="Aggiungi Investimento"
        coloreBottone="bg-[#0284c7] hover:bg-[#0369a1]"
        onScegli={(tipo) => { setTipoDaPallini(tipo); setShowAddModal(true); }}
      />
      <AggiungiInvestimentoModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} tipoIniziale={tipoDaPallini} />
      {/* Barra delle 4 schede, fissa in alto mentre si scorre (pillola "liquid
          glass" azzurra che fa già da sfondo). Su telefono, quando la scheda arriva da App,
          è nascosta: la scelta si fa dai pallini di Investimenti nella barra in basso. */}
      <BarraSchede
        ariaLabel="Sezioni di Investimenti"
        accento="#0284c7"
        fissa
        className={activeTabProp ? 'hidden md:flex' : ''}
        attiva={activeTab}
        onChange={setActiveTab}
        schede={[
          { id: 'cruscotto', etichetta: 'Cruscotto', icona: <LayoutDashboard className="w-[18px] h-[18px]" /> },
          { id: 'rendimenti', etichetta: 'Rendimenti', icona: <TrendingUp className="w-[18px] h-[18px]" /> },
          { id: 'conti', etichetta: 'Conti', icona: <Landmark className="w-[18px] h-[18px]" /> },
          { id: 'pensione', etichetta: 'Fondo Pensione', icona: <PiggyBank className="w-[18px] h-[18px]" /> }
        ]}
      />

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
