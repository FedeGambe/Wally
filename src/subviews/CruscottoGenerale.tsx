import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Database,
  Wallet,
  ChevronUp,
  ChevronDown,
  TrendingUp,
  Calendar,
  Award,
  Coins,
  Briefcase,
  Activity,
  ChevronRight,
  Shield,
  BarChart3,
  X,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts';
import EuroAmount from '../components/EuroAmount';
import { toMeseCompatto } from '../utils/date';
import { useIsMobile } from '../hooks/useIsMobile';
import { formatAxisCompact } from '../utils/format';

// Sotto-vista "Cruscotto Generale" della pagina Investimenti: è la panoramica
// riassuntiva di tutto il portafoglio investimenti (Scalable + Trade Republic insieme).
// Dati usati: CRUSCOTTO_GENERALE (totali cumulati di sempre), CRUSCOTTO_ANNO (totali
// dell'anno selezionato), cruscottoRows (uno storico riga-per-anno) e nestedPieData
// (aggregazione asset class/strumenti calcolata da src/utils/cruscottoInvestimenti.ts).
// Contenuti principali:
//  - 4 KPI card (Portafoglio Attuale, Plusvalenza Cumulata, Rendimento Anno, Contributo Anno)
//  - grafico a torta annidato (asset class all'interno, singoli strumenti all'esterno)
//  - grafico ad area "Investito vs Valore Portafoglio" nel tempo
//  - inspector del mese selezionato + tabella "Distribuzione Asset Class per Anno"
interface LegendRow {
  kind: 'single' | 'group';
  name: string;
  value: number;
  color: string;
  items?: { name: string; value: number; color: string }[];
}

// Regole di raggruppamento SOLO per la legenda "Dettaglio Strumenti" (vedi nota
// sopra la chiamata a groupLegendRows nel componente). L'ordine conta: le regole
// più specifiche (value factor, small cap, all-world/acwi) vanno prima di "world",
// altrimenti "world value factor" finirebbe nel gruppo sbagliato.
const LEGEND_GROUP_RULES: { label: string; match: (nameLower: string) => boolean }[] = [
  { label: 'Globale Value Factor', match: n => n.includes('value factor') },
  { label: 'Globale Small Cap', match: n => n.includes('small cap') },
  { label: 'Globale (sviluppati + emergenti)', match: n => n.includes('all-world') || n.includes('all world') || n.includes('acwi') },
  { label: 'Europa', match: n => n.includes('europe 600') || n.includes('europa 600') || n.includes('stoxx europe') },
  { label: 'America', match: n => n.includes('s&p 500') || n.includes('sp 500') || n.includes('sp500') },
  { label: 'Globale (sviluppati)', match: n => n.includes('world sri') || n.includes('world') },
];

function groupLegendRows(sortedItems: { name: string; value: number; color: string }[]): LegendRow[] {
  const groups = new Map<string, LegendRow>();
  const singles: LegendRow[] = [];

  sortedItems.forEach(item => {
    const nameLower = String(item.name || '').toLowerCase();
    const rule = LEGEND_GROUP_RULES.find(r => r.match(nameLower));
    if (!rule) {
      singles.push({ kind: 'single', name: item.name, value: item.value, color: item.color });
      return;
    }
    const existing = groups.get(rule.label);
    if (existing) {
      existing.value += item.value;
      existing.items!.push({ name: item.name, value: item.value, color: item.color });
    } else {
      groups.set(rule.label, {
        kind: 'group',
        name: rule.label,
        value: item.value,
        color: item.color,
        items: [{ name: item.name, value: item.value, color: item.color }],
      });
    }
  });

  return [...groups.values(), ...singles].sort((a, b) => b.value - a.value);
}

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
  // Confronto con l'anno precedente per i triangolini di Rendimento/Contributo
  // Se non esiste una riga per l'anno precedente (es. primo anno di dati), il triangolino
  // resta "su" di default (annualUp = true) invece di dare un falso segnale negativo.
  const previousYearRow = cruscottoRows.find((r: any) => Number(r.anno) === Number(globalSelectedYear) - 1);
  const annualUp = !previousYearRow || Number(CRUSCOTTO_ANNO.rendimentoAnnualeEuro || 0) >= Number(previousYearRow.rendimentoAnnualeEuro || 0);
  const isAnnualPositive = Number(CRUSCOTTO_ANNO.rendimentoAnnualeEuro || 0) >= 0;

  const isMobile = useIsMobile();
  // Su mobile il widget "Dettaglio Strumenti" parte collassato di default: aperto,
  // il contenuto non ci sta nell'altezza ridotta dello schermo e viene tagliato.
  const [isLegendCollapsed, setIsLegendCollapsed] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  const [areButtonsCollapsed, setAreButtonsCollapsed] = useState(false);
  const [chartView, setChartView] = useState<'cumulato' | 'mensile'>('cumulato');
  // Drawer unico col dettaglio di tutti gli strumenti (aperto dal bottone sotto la legenda).
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);
  const sortedFilteredDetailData = [...filteredDetailData].sort((a, b) => b.value - a.value);

  // Raggruppamento SOLO per la legenda "Dettaglio Strumenti" (la torta esterna resta
  // per singolo strumento, invariata). Prova: se non convince si toglie questo blocco
  // e si torna a renderizzare sortedFilteredDetailData direttamente.
  const legendRows = groupLegendRows(sortedFilteredDetailData);

  // Per l'investimento mensile il versamento è noto subito (a differenza della
  // valutazione di portafoglio, disponibile solo a fine mese): includiamo quindi
  // anche il mese corrente se il bonifico risulta già registrato, invece di
  // fermarci al penultimo mese come fa la vista "cumulato".
  const activeRendimentiMensili = localRendimenti.filter(
    (r: any) => r && typeof r.importoMensileInvestito === 'number' && r.importoMensileInvestito > 0
  );
  const chartDataMensile = timeRange === '12mesi' ? activeRendimentiMensili.slice(-12) : activeRendimentiMensili;
  const activeChartData = chartView === 'mensile' ? chartDataMensile : chartData;
  // Massimo assoluto delle serie effettivamente disegnate: decide se l'asse Y può
  // usare la notazione compatta "k" (vedi formatAxisCompact in utils/format.ts).
  const yAxisMaxAbs = activeChartData.reduce((max: number, row: any) => {
    const keys = chartView === 'mensile' ? ['importoMensileInvestito'] : ['importoInvestitoCumulato', 'valoreAttualePortafoglio'];
    return keys.reduce((m, k) => Math.max(m, Math.abs(Number(row[k]) || 0)), max);
  }, 0);

  const CATEGORY_STYLES: Record<string, { base: string; title: string; glow: string }> = {
    Azioni: {
      base: 'bg-blue-50/60 border-blue-400 dark:bg-blue-950/25 dark:border-blue-600',
      title: 'text-blue-700 dark:text-blue-300',
      glow: 'hover:shadow-[0_0_18px_rgba(59,130,246,0.4)] hover:border-blue-500 dark:hover:border-blue-400',
    },
    Obbligazioni: {
      base: 'bg-orange-50/60 border-orange-400 dark:bg-orange-950/25 dark:border-orange-600',
      title: 'text-orange-700 dark:text-orange-300',
      glow: 'hover:shadow-[0_0_18px_rgba(249,115,22,0.4)] hover:border-orange-500 dark:hover:border-orange-400',
    },
    Monetari: {
      base: 'bg-emerald-50/60 border-emerald-400 dark:bg-emerald-950/25 dark:border-emerald-600',
      title: 'text-emerald-700 dark:text-emerald-300',
      glow: 'hover:shadow-[0_0_18px_rgba(16,185,129,0.4)] hover:border-emerald-500 dark:hover:border-emerald-400',
    },
  };

  // Aggiunge/rimuove una asset class dal filtro attivo (click sui tile o sulle fette della torta interna):
  // aggiorna selectedMacroCategories, che a sua volta filtra sia i tile che filteredDetailData (torta esterna).
  const toggleMacroCategory = (cat: 'Azioni' | 'Obbligazioni' | 'Monetari') => {
    setSelectedMacroCategories(
      selectedMacroCategories.includes(cat)
        ? selectedMacroCategories.filter(c => c !== cat)
        : [...selectedMacroCategories, cat]
    );
  };

  // Contributo Anno = somma dei versamenti (non del rendimento) nelle 3 asset class
  // per l'anno selezionato, confrontato con lo stesso totale dell'anno precedente.
  const currentContributoTotale = Number(CRUSCOTTO_ANNO.azioniInvestitoAnno || 0) + Number(CRUSCOTTO_ANNO.obbligazioniInvestitoAnno || 0) + Number(CRUSCOTTO_ANNO.monetariInvestitoAnno || 0);
  const previousContributoTotale = previousYearRow
    ? Number(previousYearRow.azioniInvestitoAnno || 0) + Number(previousYearRow.obbligazioniInvestitoAnno || 0) + Number(previousYearRow.monetariInvestitoAnno || 0)
    : 0;
  const contributoUp = !previousYearRow || currentContributoTotale >= previousContributoTotale;

  // Contenuto del widget "Filtro Mese Selezionato": renderizzato due volte, una sola
  // volta visibile a seconda del breakpoint (vedi sotto), per spostarlo subito dopo
  // i 4 KPI card su mobile mantenendolo in fondo (accanto alla tabella) su desktop.
  const inspectorWidgetBody = globalInspectorRecord ? (
    <>
      <div>
        <span className="text-[10px] text-slate-450 font-bold uppercase tracking-wider block">Filtro Mese Selezionato</span>
        <h3 className="text-xl font-bold font-display text-slate-800 capitalize mt-2 flex items-center justify-between">
          <span>{globalInspectorRecord.mese}</span>
          <span className={`text-xs font-bold px-2 py-1 rounded-lg ${globalInspectorRecord.rendimentoMensileEuro >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
            }`}>
            {formatPercent(globalInspectorRecord.rendimentoMensilePerc)}
          </span>
        </h3>
        <p className="text-xs text-slate-400 mt-1.5 font-medium">Sintesi dei movimenti del portafoglio nel mese</p>
      </div>

      <div className="my-6 space-y-3 border-t border-b border-slate-200 py-4 font-semibold text-xs text-slate-600">
        <div className="flex justify-between">
          <span>Valore Portafoglio:</span>
          <span className="text-slate-800 font-bold font-mono">{formatEuro(globalInspectorRecord.valoreAttualePortafoglio)}</span>
        </div>
        <div className="flex justify-between">
          <span>Importo Investito Mese:</span>
          <span className="text-slate-850 font-bold font-mono">{formatEuro(globalInspectorRecord.importoMensileInvestito)}</span>
        </div>
        <div className="flex justify-between">
          <span>Risultato Netto (€):</span>
          <span className={`font-bold font-mono ${globalInspectorRecord.rendimentoMensileEuro >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
            {formatEuro(globalInspectorRecord.rendimentoMensileEuro)}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Plusvalenza Cumulata:</span>
          <span className="text-sky-600 font-bold font-mono">{formatEuro(globalInspectorRecord.rendimentoCumulativoEuro)}</span>
        </div>
      </div>

      <div className="text-[10px] text-slate-400 font-medium">
        * Mostra il mese selezionato globalmente o quello precedente se è selezionato il mese corrente.
      </div>
    </>
  ) : (
    <div className="flex items-center justify-center h-full text-xs text-slate-400">
      Nessun dato disponibile per il periodo selezionato.
    </div>
  );

  return (
    <div className="space-y-6 text-left animate-fadeIn">
      {/* Key KPI grouped section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GRUPPO 1: DATI CUMULATI STORICI */}
        <div className="bg-slate-50/55 dark:bg-[#0c1425]/40 p-4 rounded-3xl border border-slate-200/75 dark:border-slate-800/80 shadow-xs space-y-3 text-left">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-black uppercase text-slate-400 dark:text-slate-300 tracking-wider flex items-center gap-1.5">
              <Database className="w-4 h-4 text-slate-400 dark:text-slate-300" />
              Dati Cumulati Storici
            </span>
            <span className="text-[9px] bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full font-bold">
              Sempre Aggiornato
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:gap-4">
            {/* Portafoglio Attuale Box */}
            <div className="bg-gradient-to-br from-sky-950 via-slate-900 to-sky-900 text-white p-3 sm:p-5 rounded-2xl border border-sky-900 dark:border-sky-900 shadow-[0_0_15px_rgba(14,165,233,0.12)] flex flex-col justify-between min-h-[130px] sm:h-36 transition-all duration-300 hover:shadow-[0_0_25px_rgba(14,165,233,0.3)] hover:border-sky-900/30 dark:hover:border-sky-800/25 hover:scale-[1.01]">
              <div className="flex justify-between items-start">
                <span className="text-[10px] text-sky-300 font-extrabold uppercase tracking-wider block">Portafoglio Attuale</span>
                <div className="bg-sky-950/50 p-1 rounded-lg">
                  <Wallet className="w-4 h-4 text-sky-400" />
                </div>
              </div>
              <div className="mt-2">
                {/* Valore attuale del portafoglio = capitale versato in ogni asset class (cumulato di sempre)
                    + la plusvalenza/minusvalenza cumulata. Non è un valore letto direttamente dal foglio,
                    ma ricostruito sommando questi pezzi. */}
                <span className="text-lg sm:text-2xl font-black font-display text-white block">
                  <EuroAmount value={CRUSCOTTO_GENERALE.azioniInvestitoCum + CRUSCOTTO_GENERALE.obbligazioniInvestitoCum + CRUSCOTTO_GENERALE.monetariInvestitoCum + CRUSCOTTO_GENERALE.rendimentoCumulativoEuro} />
                </span>
              </div>
              <div className="border-t border-sky-800/60 pt-2 mt-2">
                <p className="text-[10px] text-sky-300 font-medium">Investito:   <span className="text-[12px] font-bold text-white">{formatEuro(CRUSCOTTO_GENERALE.azioniInvestitoCum + CRUSCOTTO_GENERALE.obbligazioniInvestitoCum + (CRUSCOTTO_GENERALE.monetariInvestitoCum || 0) + (CRUSCOTTO_GENERALE.commissioniCum || 0))}</span></p>
              </div>
            </div>

            {/* Plusvalenza Cumulata Box */}
            <div className={`p-3 sm:p-5 rounded-2xl border flex flex-col justify-between min-h-[130px] sm:h-36 transition-all duration-300 ${CRUSCOTTO_GENERALE.rendimentoCumulativoEuro >= 0
                ? 'bg-emerald-50/10 dark:bg-emerald-950/10 border-emerald-500/30 dark:border-emerald-500/25 shadow-[0_0_15px_rgba(16,185,129,0.12)] hover:shadow-[0_0_25px_rgba(16,185,129,0.32)] hover:border-emerald-500/15 dark:hover:border-emerald-500/10'
                : 'bg-white dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800/60 shadow-xs hover:shadow-md'
              }`}>
              <div className="flex justify-between items-start">
                <span className="text-[10px] text-slate-400 dark:text-slate-300 font-extrabold uppercase tracking-wider block">Plusvalenza Cumulata</span>
                <div className="bg-emerald-50 dark:bg-emerald-950/50 p-1 rounded-lg">
                  <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
              <div className="mt-2">
                <span className="text-lg sm:text-2xl font-extrabold font-display text-emerald-600 dark:text-emerald-400 block flex items-center gap-0.5">
                  <ChevronUp className="w-5 h-5 shrink-0" />
                  <EuroAmount value={CRUSCOTTO_GENERALE.rendimentoCumulativoEuro} />
                </span>
              </div>
              <div className="border-t border-slate-100 dark:border-slate-800 pt-2 mt-2 flex justify-between items-center text-[9px]">
                <span className="text-[10px] text-slate-400 dark:text-slate-400 font-medium">Rendimento Totale</span>
                <span className="text-[12px] bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300/70 dark:border-emerald-700/60 px-1.5 py-0.5 rounded-lg font-extrabold font-mono">
                  {formatPercent(lastValidRendimento?.rendimentoCumulativoPerc)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* GRUPPO 2: PERFORMANCE ANNO SELEZIONATO */}
        <div className="bg-slate-50/55 dark:bg-[#0c1425]/40 p-4 rounded-3xl border border-slate-200/75 dark:border-slate-800/80 shadow-xs space-y-3 text-left">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-black uppercase text-slate-400 dark:text-slate-300 tracking-wider flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-400 dark:text-slate-300" />
              Performance Anno {globalSelectedYear}
            </span>
            <span className="text-[9px] bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full font-bold">
              Anno Selezionato
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:gap-4">
            {/* Rendimento Annuo Box */}
            <div className="bg-[#0c1425]/90 p-3 sm:p-5 rounded-2xl border border-sky-900/60 shadow-xs flex flex-col justify-between min-h-[130px] sm:h-36 transition-all duration-300 hover:shadow-md hover:border-sky-700">
              <div className="flex justify-between items-start">
                <span className="text-[10px] text-slate-300 font-extrabold uppercase tracking-wider block">Rendimento {globalSelectedYear}</span>
                <div className="bg-sky-950/50 p-1 rounded-lg">
                  <Award className="w-4 h-4 text-sky-400" />
                </div>
              </div>
              <div className="mt-2">
                <span className={`text-lg sm:text-2xl font-extrabold font-display block flex items-baseline gap-1 flex-wrap ${isAnnualPositive ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                  <span className="flex items-center gap-0.5">
                    {annualUp ? <ChevronUp className="w-5 h-5 shrink-0" /> : <ChevronDown className="w-5 h-5 shrink-0" />}
                    <EuroAmount value={CRUSCOTTO_ANNO.rendimentoAnnualeEuro} />
                  </span>
                  <span className={`text-xs font-semibold ${isAnnualPositive ? 'text-emerald-300' : 'text-rose-300'}`}>
                    ({formatPercent(calculatedRendimentoAnnuo)})
                  </span>
                </span>
              </div>
              <div className="border-t border-sky-900/60 pt-2 mt-2 flex justify-between items-center text-[9px] text-slate-400">
                <span>Media mensile ({elapsedMonthsForSelectedYear}m)</span>
                <span className="text-[12px] font-bold text-slate-300 font-mono">{formatPercent(CRUSCOTTO_ANNO.rendimentoMedioMensilePerc)}</span>
              </div>
            </div>

            {/* Contributo Anno Box */}
            <div className="bg-[#0c1425]/90 p-3 sm:p-5 rounded-2xl border border-sky-900/60 shadow-xs flex flex-col justify-between min-h-[130px] sm:h-36 transition-all duration-300 hover:shadow-md hover:border-sky-700">
              <div className="flex justify-between items-start">
                <span className="text-[10px] text-slate-300 font-extrabold uppercase tracking-wider block">Contributo {globalSelectedYear}</span>
                <div className="bg-sky-950/50 p-1 rounded-lg">
                  <Coins className="w-4 h-4 text-sky-400" />
                </div>
              </div>
              <div className="mt-2">
                <span className="text-lg sm:text-2xl font-extrabold font-display text-slate-100 flex items-center gap-0.5">
                  {contributoUp ? (
                    <ChevronUp className="w-5 h-5 shrink-0 text-slate-500" />
                  ) : (
                    <ChevronDown className="w-5 h-5 shrink-0 text-slate-500" />
                  )}
                  <EuroAmount value={CRUSCOTTO_ANNO.azioniInvestitoAnno + CRUSCOTTO_ANNO.obbligazioniInvestitoAnno + (CRUSCOTTO_ANNO.monetariInvestitoAnno || 0)} />
                </span>
              </div>
              <div className="border-t border-sky-900/60 pt-2 mt-2 flex justify-between items-center text-[9px] text-slate-400">
                <span>Contributo Totale</span>
                <span className="text-[12px] font-extrabold text-sky-400 font-mono">
                  {formatEuro(CRUSCOTTO_GENERALE.azioniInvestitoCum + CRUSCOTTO_GENERALE.obbligazioniInvestitoCum + (CRUSCOTTO_GENERALE.monetariInvestitoCum || 0) + (CRUSCOTTO_GENERALE.commissioniCum || 0))}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filtro Mese Selezionato: solo mobile, subito dopo i 4 KPI card in alto (su desktop resta in fondo, vedi sotto) */}
      <div className="lg:hidden bg-slate-50 p-6 rounded-3xl border border-slate-200 flex flex-col justify-between transition-all duration-300 hover:shadow-md">
        {inspectorWidgetBody}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Doppio Grafico a Torta (Nested Pie Chart) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between transition-all duration-300 hover:shadow-md h-auto md:h-[540px]">
          <div>
            <h3 className="font-bold text-slate-800 font-display text-base flex items-center gap-1.5 mb-1">
              <Briefcase className="w-5 h-5 text-sky-600" />
              Ripartizione Asset e Strumenti
            </h3>
            <p className="text-xs text-slate-400 mb-2">
              Asset class all'interno, dettaglio strumenti all'esterno (Scalable e Trade Republic)
            </p>
          </div>

          {/* Custom compact Tooltip for Recharts */}
          {/* Tooltip personalizzato: Recharts di default non permette di calcolare la percentuale
              sul totale, quindi la calcoliamo qui a mano dividendo il valore della fetta per
              totalAssetAllocation (il totale investito in tutte le asset class). */}
          {(() => {
            const CustomTooltip = ({ active, payload }: any) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                const val = payload[0].value;
                const name = payload[0].name;
                const total = totalAssetAllocation;
                const pct = total > 0 ? ((Number(val) / total) * 100).toFixed(1) : '0.0';

                // Use the exact color of the macro category or instrument slice
                const pctColor = data.color || payload[0].color || payload[0].payload?.color || '#10b981';

                return (
                  <div className="bg-slate-900/95 backdrop-blur-xs text-slate-100 px-4 py-3 rounded-2xl shadow-xl text-sm font-bold border border-slate-800 leading-tight">
                    <div className="flex items-center gap-2 mb-2 font-black">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: pctColor }} />
                      <span className="uppercase text-xs tracking-wider text-slate-200 truncate max-w-[180px]">{name}</span>
                    </div>
                    <div className="flex items-center justify-between gap-5 font-mono font-black text-white">
                      <span>{formatEuro(val)}</span>
                      <span style={{ color: pctColor }}>({pct}%)</span>
                    </div>
                  </div>
                );
              }
              return null;
            };

            return (
              <div className="flex-1 flex flex-col md:min-h-0 overflow-visible md:overflow-hidden mt-3">
                {/* 1. Macro Data Legend Tiles (Interactive buttons) - FULL WIDTH */}
                <div className="mb-4 shrink-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Filtri Asset Class</span>
                    <button
                      onClick={() => setAreButtonsCollapsed(v => !v)}
                      className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      aria-label={areButtonsCollapsed ? 'Mostra filtri' : 'Nascondi filtri'}
                    >
                      <ChevronRight className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${areButtonsCollapsed ? '' : 'rotate-90'}`} />
                    </button>
                  </div>
                  {!areButtonsCollapsed && (
                    <div className="grid grid-cols-3 gap-2">
                      {nestedPieData.macroData.map((item, idx) => {
                        const value = item.value;
                        const percentage = totalAssetAllocation > 0 ? (value / totalAssetAllocation) * 105 : 0; // Wait, total allocation %
                        // Percentuale reale della asset class sul totale investito (quella mostrata a schermo).
                        const actualPercent = totalAssetAllocation > 0 ? (value / totalAssetAllocation) * 100 : 0;
                        const categoryKey = item.name as 'Azioni' | 'Obbligazioni' | 'Monetari';
                        const isSelected = selectedMacroCategories.includes(categoryKey);
                        const style = CATEGORY_STYLES[categoryKey];

                        // Two-state styling: selected (own light color, bright border) vs deselected (grayed out)
                        let containerClass = '';
                        let textTitleClass = '';
                        let textPercentageClass = '';
                        let textAmountClass = '';
                        const dotColor = item.color;

                        if (isSelected) {
                          containerClass = `border-2 ${style.base} ${style.glow} shadow-sm`;
                          textTitleClass = `${style.title} font-bold`;
                          textPercentageClass = 'text-slate-800 dark:text-slate-100 font-extrabold';
                          textAmountClass = 'text-slate-500 dark:text-slate-400';
                        } else {
                          containerClass = 'border-2 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 opacity-50 hover:opacity-80';
                          textTitleClass = 'text-slate-400 font-semibold';
                          textPercentageClass = 'text-slate-400 font-extrabold';
                          textAmountClass = 'text-slate-400/70';
                        }

                        return (
                          <button
                            key={idx}
                            onClick={() => toggleMacroCategory(categoryKey)}
                            className={`p-2 rounded-xl flex flex-col justify-between text-left transition-all duration-200 cursor-pointer active:scale-[0.97] h-[64px] ${containerClass}`}
                          >
                            <div className="flex items-center gap-1.5 truncate w-full">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: dotColor, opacity: isSelected ? 1 : 0.4 }} />
                              <span className={`text-[10px] truncate uppercase tracking-wider ${textTitleClass}`}>{item.name}</span>
                            </div>
                            <div className="mt-0.5 flex flex-col">
                              <span className={`font-mono text-[11px] leading-tight ${textPercentageClass}`}>{actualPercent.toFixed(1)}%</span>
                              <span className={`text-[9px] font-mono leading-none ${textAmountClass}`}>{formatEuro(value)}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Chart/Legend Split Grid: legend collapses to a thin rail on the right, chart expands and stays centered */}
                <div className={`flex-1 grid grid-cols-1 gap-6 items-start md:items-center md:min-h-0 overflow-visible md:overflow-hidden transition-all duration-300 ${isLegendCollapsed ? 'md:grid-cols-[1fr_auto]' : 'md:grid-cols-2'}`}>
                  {/* Pie Chart Column */}
                  <div className="h-full min-h-[240px] md:min-h-[260px] flex items-center justify-center relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        {/* Inner Pie: Macro asset allocation */}
                        <Pie
                          data={nestedPieData.macroData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          stroke="none"
                          dataKey="value"
                        >
                          {nestedPieData.macroData.map((entry: any, index: number) => {
                            const isDimmed = !selectedMacroCategories.includes(entry.name);
                            return (
                              <Cell
                                key={`cell-macro-${index}`}
                                fill={entry.color}
                                opacity={isDimmed ? 0.25 : 1}
                                className="cursor-pointer transition-opacity duration-200"
                                onClick={() => toggleMacroCategory(entry.name)}
                              />
                            );
                          })}
                        </Pie>
                        {/* Outer Pie: Detailed instruments (filtered by selected macro category) */}
                        <Pie
                          data={filteredDetailData}
                          cx="50%"
                          cy="50%"
                          innerRadius={85}
                          outerRadius={115}
                          stroke="none"
                          dataKey="value"
                        >
                          {filteredDetailData.map((entry: any, index: number) => (
                            <Cell key={`cell-detail-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} wrapperStyle={{ zIndex: 100 }} />
                      </PieChart>
                    </ResponsiveContainer>

                    {/* Centered Label for Donut chart */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-1 z-10">
                      <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Investito</span>
                      <span className="text-sm font-black text-slate-800 font-mono">
                        {formatEuro(totalAssetAllocation)}
                      </span>
                    </div>
                  </div>

                  {/* Micro Data Legend Column - collapses to a narrow rail on the right, title stays visible */}
                  <div className={`h-auto md:h-full flex flex-col md:min-h-0 overflow-visible md:overflow-hidden pb-1 transition-all duration-300 ${isLegendCollapsed ? 'md:max-w-[150px]' : 'w-full'}`}>
                    <div className="flex items-center justify-between mb-1.5 shrink-0 gap-2 w-full">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider truncate">
                        Dettaglio Strumenti {selectedMacroCategories.length < 3 && `(${selectedMacroCategories.join(', ')})`}
                      </span>
                      <div className="flex items-center gap-2 ml-auto shrink-0">
                        {!isLegendCollapsed && selectedMacroCategories.length < 3 && (
                          <button
                            onClick={() => setSelectedMacroCategories(['Azioni', 'Obbligazioni', 'Monetari'])}
                            className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer transition-colors whitespace-nowrap"
                          >
                            Mostra tutti
                          </button>
                        )}
                        <button
                          onClick={() => setIsLegendCollapsed(v => !v)}
                          className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                          aria-label={isLegendCollapsed ? 'Espandi legenda' : 'Comprimi legenda'}
                        >
                          <ChevronRight className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isLegendCollapsed ? '' : 'rotate-90'}`} />
                        </button>
                      </div>
                    </div>
                    {!isLegendCollapsed && (
                      <div className="md:flex-1 overflow-y-auto pr-1 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-200">
                        {legendRows.map((row, idx) => {
                          const rowPerc = totalAssetAllocation > 0 ? (row.value / totalAssetAllocation) * 100 : 0;
                          return (
                            <div
                              key={idx}
                              className="flex items-center justify-between font-semibold py-1 hover:bg-slate-50/50 px-1.5 rounded-lg transition-colors text-[11px]"
                            >
                              <div className="flex items-center gap-2 truncate max-w-[130px] sm:max-w-[150px]">
                                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: row.color }} />
                                <span className="text-slate-500 truncate uppercase font-bold" title={row.name}>{row.name}</span>
                              </div>
                              <div className="flex items-center gap-2 font-mono text-right shrink-0">
                                <span className="text-slate-500 font-extrabold text-[10px]">({rowPerc.toFixed(1)}%)</span>
                                <span className="text-slate-880 font-bold">{formatEuro(row.value)}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {/* Sempre visibile, anche a legenda collassata (su mobile parte collassata di default) */}
                    <button
                      onClick={() => setShowDetailDrawer(true)}
                      className="mt-2 shrink-0 text-[10px] font-bold text-white uppercase tracking-wider py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 dark:bg-sky-600 dark:hover:bg-sky-500 transition-all cursor-pointer md:hover:scale-[1.03]"
                    >
                      Dettaglio strumenti
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Drawer unico con il dettaglio di TUTTI gli strumenti (raggruppati per macro-gruppo
            di legenda, es. "Globale (sviluppati)" -> World, World SRI). */}
        <AnimatePresence>
          {showDetailDrawer && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.35 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowDetailDrawer(false)}
                className="fixed inset-0 bg-slate-900 z-[55]"
              />
              <motion.div
                initial={{ opacity: 0, x: '100%' }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white dark:bg-[#0b0f19]/95 backdrop-blur-xl shadow-2xl z-[60] flex flex-col h-full border-l border-slate-200 dark:border-white/10"
              >
                <div className="p-6 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 font-display">Capitale Investito per Strumento</h3>
                    <p className="text-xs text-slate-400 mt-1">{formatEuro(totalAssetAllocation)} investiti (non riflette il valore attuale)</p>
                  </div>
                  <button
                    onClick={() => setShowDetailDrawer(false)}
                    className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-4 pb-28 md:pb-6">
                  {legendRows.map((row, idx) => {
                    const rowPerc = totalAssetAllocation > 0 ? (row.value / totalAssetAllocation) * 100 : 0;
                    return (
                      <div key={idx}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2 truncate">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: row.color }} />
                            <span className="text-slate-800 dark:text-white text-xs font-bold truncate" title={row.name}>{row.name}</span>
                          </div>
                          <span className="text-slate-800 dark:text-white text-xs font-mono font-bold shrink-0">
                            ({rowPerc.toFixed(1)}%) {formatEuro(row.value)}
                          </span>
                        </div>
                        {row.kind === 'group' && (
                          <div className="space-y-1.5 pl-3.5">
                            {row.items!.map((sub, subIdx) => {
                              const subPerc = row.value > 0 ? (sub.value / row.value) * 100 : 0;
                              return (
                                <div key={subIdx} className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
                                  <div className="flex items-center gap-2 truncate">
                                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: sub.color }} />
                                    <span className="text-slate-500 dark:text-slate-400 text-[11px] font-medium truncate" title={sub.name}>{sub.name}</span>
                                  </div>
                                  <div className="flex items-center gap-2 font-mono text-right shrink-0">
                                    <span className="text-slate-400 text-[10px] font-bold">({subPerc.toFixed(1)}%)</span>
                                    <span className="text-slate-500 dark:text-slate-400 text-[11px] font-semibold">{formatEuro(sub.value)}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Investito vs Valore Portafoglio Widget: layout ricalcato 1:1 da Rendimenti.tsx (widget "Andamento Rendimenti") */}
        <div className="bg-white dark:bg-[#0c1425]/45 p-6 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-1">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 font-display text-base flex items-center gap-1.5">
              <Activity className="w-5 h-5 text-sky-600 dark:text-sky-400" />
              Andamento Investimenti
            </h3>
            <div className="flex bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl gap-0.5 border border-slate-200 dark:border-slate-700/60 select-none">
              <button
                onClick={() => { setChartView('cumulato'); setTimeRange('storico'); }}
                className={`flex items-center gap-1 text-[10px] px-3 py-1.5 font-extrabold rounded-lg transition-all cursor-pointer ${chartView === 'cumulato' ? 'bg-sky-700 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-sky-700'
                  }`}
              >
                Cumulato
              </button>
              <button
                onClick={() => { setChartView('mensile'); setTimeRange('12mesi'); }}
                className={`flex items-center gap-1 text-[10px] px-3 py-1.5 font-extrabold rounded-lg transition-all cursor-pointer ${chartView === 'mensile' ? 'bg-sky-700 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-sky-700'
                  }`}
              >
                Mensile
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-4 font-medium">
            Andamento del portafoglio nel tempo, {chartView === 'mensile' ? 'importo versato ogni mese' : 'capitale investito confrontato con il valore di mercato'}.
          </p>

          <div className="flex flex-col h-[440px] p-4 rounded-2xl bg-slate-50/60 dark:bg-slate-900/20 border border-slate-200/70 dark:border-slate-800/60">
            <div className="flex items-center justify-between gap-3 mb-2">
              <h4 className="font-bold text-slate-700 dark:text-slate-200 text-sm flex items-center gap-1.5">
                {chartView === 'mensile' ? <BarChart3 className="w-4 h-4 text-sky-600 dark:text-sky-400" /> : <TrendingUp className="w-4 h-4 text-sky-600 dark:text-sky-400" />}
                {chartView === 'mensile' ? 'Investimento Mensile' : 'Investimento Cumulato'}
              </h4>
              <div className="flex bg-white dark:bg-slate-800/60 p-1 rounded-xl gap-0.5 border border-slate-200 dark:border-slate-700/60 select-none">
                <button
                  onClick={() => setTimeRange('storico')}
                  className={`flex-1 text-center whitespace-nowrap text-[9px] px-2.5 py-1.5 font-extrabold rounded-lg transition-all cursor-pointer ${timeRange === 'storico' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-sky-600'
                    }`}
                >
                  Storico
                </button>
                <button
                  onClick={() => setTimeRange('12mesi')}
                  className={`flex-1 text-center whitespace-nowrap text-[9px] px-2.5 py-1.5 font-extrabold rounded-lg transition-all cursor-pointer ${timeRange === '12mesi' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-sky-600'
                    }`}
                >
                  <span className="sm:hidden">Ultimi 12 M.</span>
                  <span className="hidden sm:inline">Ultimi 12 Mesi</span>
                </button>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-2 font-medium">
              {chartView === 'mensile'
                ? 'Importo versato mese per mese sui conti di investimento.'
                : "Confronto storico tra il capitale depositato e l'attuale valore di mercato."}
            </p>
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">
                {timeRange === '12mesi' ? 'Focus Periodo (Ultimi 12 Mesi)' : 'Storico Completo'}
              </span>
              <span className="text-[10px] text-slate-500">
                {activeChartData.length > 0 ? `${activeChartData[0]?.mese} - ${activeChartData[activeChartData.length - 1]?.mese}` : ''}
              </span>
            </div>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activeChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorInvestitoValore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.01} />
                    </linearGradient>
                    <linearGradient id="colorValorePortafoglio" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.01} />
                    </linearGradient>
                    <linearGradient id="colorInvestitoMensile" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="strokeInvestitoMensile" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38bdf8" />
                      <stop offset="100%" stopColor="#075985" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="mese" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={9}
                    tickLine={false}
                    axisLine={false}
                    width={isMobile ? 42 : 60}
                    tickFormatter={(val) => isMobile
                      ? formatAxisCompact(val, yAxisMaxAbs)
                      : `€${Number(val).toLocaleString('it-IT')}`}
                  />
                  <Tooltip
                    formatter={(value: any) => formatEuro(value)}
                    contentStyle={{
                      background: '#1e293b',
                      border: 'none',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '11px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                    itemStyle={{ color: '#fff' }}
                    labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
                  />
                  {chartView === 'mensile' ? (
                    <Area
                      type="monotone"
                      name="Investimento Mensile"
                      dataKey="importoMensileInvestito"
                      stroke="url(#strokeInvestitoMensile)"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorInvestitoMensile)"
                      dot={false}
                      activeDot={{ r: 6 }}
                    />
                  ) : (
                    <>
                      <Area
                        type="monotone"
                        name="Capitale Investito"
                        dataKey="importoInvestitoCumulato"
                        stroke="#64748b"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorInvestitoValore)"
                        dot={false}
                        activeDot={{ r: 5 }}
                      />
                      <Area
                        type="monotone"
                        name="Valore Portafoglio"
                        dataKey="valoreAttualePortafoglio"
                        stroke="#0ea5e9"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorValorePortafoglio)"
                        dot={false}
                        activeDot={{ r: 6 }}
                      />
                    </>
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-500 flex justify-between items-center shrink-0">
              <div>
                <span className="block text-[9px] uppercase text-slate-400 font-bold">Inizio Range</span>
                <span className="text-slate-800 dark:text-slate-100 font-bold font-mono">
                  <span className="sm:hidden">{activeChartData[0]?.mese ? toMeseCompatto(activeChartData[0].mese) : 'N/D'}</span>
                  <span className="hidden sm:inline">{activeChartData[0]?.mese || 'N/D'}</span>
                </span>
              </div>
              <div className="text-right">
                <span className="block text-[9px] uppercase text-slate-400 font-bold">Fine Range</span>
                <span className="font-bold font-mono text-slate-800 dark:text-slate-100">
                  <span className="sm:hidden">{activeChartData[activeChartData.length - 1]?.mese ? toMeseCompatto(activeChartData[activeChartData.length - 1].mese) : 'N/D'}</span>
                  <span className="hidden sm:inline">{activeChartData[activeChartData.length - 1]?.mese || 'N/D'}</span> (
                  <span className="text-sky-600 dark:text-sky-400">
                    {formatEuro(chartView === 'mensile'
                      ? activeChartData[activeChartData.length - 1]?.importoMensileInvestito || 0
                      : activeChartData[activeChartData.length - 1]?.valoreAttualePortafoglio || 0)}
                  </span>
                  )
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid containing Monthly returns inspector card on the left, and Distribuzione Asset Class table on the right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
        {/* Left Column: Inspector widget (desktop only qui, su mobile è duplicato subito dopo i KPI in alto) */}
        <div className="hidden lg:flex lg:col-span-1 bg-slate-50 p-6 rounded-3xl border border-slate-200 flex-col justify-between transition-all duration-300 hover:shadow-md">
          {inspectorWidgetBody}
        </div>

        {/* Right Column: Distribuzione Asset Class per Anno */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm transition-all duration-300 hover:shadow-md flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-800 font-display text-base mb-4">Distribuzione Asset Class per Anno</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800/60 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Anno</th>
                    <th className="py-3 px-4 text-right">Azioni Cum.</th>
                    <th className="py-3 px-4 text-right">Azioni Ann.</th>
                    <th className="py-3 px-4 text-right">Obblig. Cum.</th>
                    <th className="py-3 px-4 text-right">Obblig. Ann.</th>
                    <th className="py-3 px-4 text-right">Monet. Cum.</th>
                    <th className="py-3 px-4 text-right">Monet. Ann.</th>
                    <th className="py-3 px-4 text-right">Valutazione</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50 text-xs">
                  {cruscottoRows.map((row: any) => {
                    const isCorrente = Number(row.anno) === Number(cruscottoRows[0]?.anno);
                    // Stessa formula del box "Portafoglio Attuale" sopra, anno per anno storico:
                    // capitale cumulato investito nelle 3 asset class + plusvalenza cumulata a fine anno.
                    // Le commissioni NON si sommano qui: il rendimento (foglio Rendimenti) è già
                    // calcolato al netto di quelle, sommarle di nuovo sarebbe doppio conteggio.
                    const valuationSum = Number(row.azioniInvestitoCum || 0) +
                      Number(row.obbligazioniInvestitoCum || 0) +
                      Number(row.monetariInvestitoCum || 0) +
                      Number(row.rendimentoCumulativoEuro || 0);
                    return (
                      <tr key={row.anno} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/20 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-100">
                          {row.anno} {isCorrente ? '' : ''}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono">{formatEuro(row.azioniInvestitoCum)}</td>
                        <td className="py-3.5 px-4 text-right text-emerald-600 font-bold font-mono">
                          +{formatEuro(row.azioniInvestitoAnno)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono">{formatEuro(row.obbligazioniInvestitoCum)}</td>
                        <td className="py-3.5 px-4 text-right text-emerald-600 font-bold font-mono">
                          +{formatEuro(row.obbligazioniInvestitoAnno)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono">{formatEuro(row.monetariInvestitoCum)}</td>
                        <td className="py-3.5 px-4 text-right text-emerald-600 font-bold font-mono">
                          +{formatEuro(row.monetariInvestitoAnno)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-sky-600 font-mono">
                          {formatEuro(valuationSum)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
