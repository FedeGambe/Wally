import React, { useState } from 'react';
import { Briefcase, ChevronRight } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import SlideOverPanel from '../SlideOverPanel';

// Estratto da CruscottoGenerale.tsx: la card "Ripartizione Asset e Strumenti"
// (torta annidata asset class + strumenti, filtri asset class, legenda con
// raggruppamento e drawer di dettaglio strumenti).
interface LegendRow {
  kind: 'single' | 'group';
  name: string;
  value: number;
  color: string;
  investitoUltimoMese: boolean;
  items?: { name: string; value: number; color: string; investitoUltimoMese: boolean }[];
}

// Pallino colorato della legenda/drawer: pulsa (animate-ping) + glow (box-shadow
// colorato) se lo strumento (o, per un gruppo, almeno uno dei suoi strumenti) ha
// avuto un versamento nell'ultimo mese disponibile (investitoUltimoMese,
// calcolato in computeRealAssetAllocation).
function LegendDot({ color, pulsing, className = 'w-1.5 h-1.5' }: { color: string; pulsing: boolean; className?: string }) {
  return (
    <span className={`relative inline-flex shrink-0 ${className}`}>
      {pulsing && (
        <span className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping" style={{ backgroundColor: color }} />
      )}
      <span
        className="relative inline-flex w-full h-full rounded-full"
        style={{
          backgroundColor: color,
          boxShadow: pulsing ? `0 0 6px 2px color-mix(in srgb, white var(--glow-white-mix), ${color})` : undefined
        }}
      />
    </span>
  );
}

// Regole di raggruppamento SOLO per la legenda "Dettaglio Strumenti". L'ordine
// conta: le regole più specifiche (value factor, small cap, all-world/acwi)
// vanno prima di "world", altrimenti "world value factor" finirebbe nel
// gruppo sbagliato.
const LEGEND_GROUP_RULES: { label: string; match: (nameLower: string) => boolean }[] = [
  { label: 'Globale Value Factor', match: n => n.includes('value factor') },
  { label: 'Globale Small Cap', match: n => n.includes('small cap') },
  { label: 'Globale (sviluppati + emergenti)', match: n => n.includes('all-world') || n.includes('all world') || n.includes('acwi') },
  { label: 'Europa', match: n => n.includes('europe 600') || n.includes('europa 600') || n.includes('stoxx europe') },
  { label: 'America', match: n => n.includes('s&p 500') || n.includes('sp 500') || n.includes('sp500') },
  { label: 'Globale (sviluppati)', match: n => n.includes('world sri') || n.includes('world') },
];

function groupLegendRows(sortedItems: { name: string; value: number; color: string; investitoUltimoMese?: boolean }[]): LegendRow[] {
  const groups = new Map<string, LegendRow>();
  const singles: LegendRow[] = [];

  sortedItems.forEach(item => {
    const nameLower = String(item.name || '').toLowerCase();
    const rule = LEGEND_GROUP_RULES.find(r => r.match(nameLower));
    const investitoUltimoMese = Boolean(item.investitoUltimoMese);
    if (!rule) {
      singles.push({ kind: 'single', name: item.name, value: item.value, color: item.color, investitoUltimoMese });
      return;
    }
    const existing = groups.get(rule.label);
    if (existing) {
      existing.value += item.value;
      existing.investitoUltimoMese = existing.investitoUltimoMese || investitoUltimoMese;
      existing.items!.push({ name: item.name, value: item.value, color: item.color, investitoUltimoMese });
    } else {
      groups.set(rule.label, {
        kind: 'group',
        name: rule.label,
        value: item.value,
        color: item.color,
        investitoUltimoMese,
        items: [{ name: item.name, value: item.value, color: item.color, investitoUltimoMese }],
      });
    }
  });

  return [...groups.values(), ...singles].sort((a, b) => b.value - a.value);
}

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

interface CruscottoAssetAllocationCardProps {
  nestedPieData: { macroData: any[]; detailData: any[] };
  totalAssetAllocation: number;
  selectedMacroCategories: Array<'Azioni' | 'Obbligazioni' | 'Monetari'>;
  setSelectedMacroCategories: (cats: Array<'Azioni' | 'Obbligazioni' | 'Monetari'>) => void;
  filteredDetailData: any[];
  formatEuro: (val: any) => string;
}

export default function CruscottoAssetAllocationCard({
  nestedPieData,
  totalAssetAllocation,
  selectedMacroCategories,
  setSelectedMacroCategories,
  filteredDetailData,
  formatEuro
}: CruscottoAssetAllocationCardProps) {
  // Su mobile il widget "Dettaglio Strumenti" parte collassato di default: aperto,
  // il contenuto non ci sta nell'altezza ridotta dello schermo e viene tagliato.
  const [isLegendCollapsed, setIsLegendCollapsed] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  const [areButtonsCollapsed, setAreButtonsCollapsed] = useState(false);
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);
  const sortedFilteredDetailData = [...filteredDetailData].sort((a, b) => b.value - a.value);

  // Raggruppamento SOLO per la legenda "Dettaglio Strumenti" (la torta esterna resta
  // per singolo strumento, invariata).
  const legendRows = groupLegendRows(sortedFilteredDetailData);

  // Aggiunge/rimuove una asset class dal filtro attivo (click sui tile o sulle fette della torta interna):
  // aggiorna selectedMacroCategories, che a sua volta filtra sia i tile che filteredDetailData (torta esterna).
  const toggleMacroCategory = (cat: 'Azioni' | 'Obbligazioni' | 'Monetari') => {
    setSelectedMacroCategories(
      selectedMacroCategories.includes(cat)
        ? selectedMacroCategories.filter(c => c !== cat)
        : [...selectedMacroCategories, cat]
    );
  };

  // Tooltip personalizzato: Recharts di default non permette di calcolare la percentuale
  // sul totale, quindi la calcoliamo qui a mano dividendo il valore della fetta per
  // totalAssetAllocation (il totale investito in tutte le asset class).
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const val = payload[0].value;
      const name = payload[0].name;
      const total = totalAssetAllocation;
      const pct = total > 0 ? ((Number(val) / total) * 100).toFixed(1) : '0.0';
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
    <>
      <div className="bg-white p-6 rounded-3xl border border-hairline shadow-sm flex flex-col justify-between transition-all duration-300 hover:shadow-md h-auto md:h-[540px]">
        <div>
          <h3 className="font-bold text-ink font-display text-base flex items-center gap-1.5 mb-1">
            <Briefcase className="w-5 h-5 text-sky-600" />
            Ripartizione Asset e Strumenti
          </h3>
          <p className="text-xs text-ink-soft mb-2">
            Asset class all'interno, dettaglio strumenti all'esterno (Scalable e Trade Republic)
          </p>
        </div>

        <div className="flex-1 flex flex-col md:min-h-0 overflow-visible md:overflow-hidden mt-3">
          {/* 1. Macro Data Legend Tiles (Interactive buttons) - FULL WIDTH */}
          <div className="mb-4 shrink-0">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-3xs uppercase font-bold text-ink-soft tracking-wider">Filtri Asset Class</span>
              <button
                onClick={() => setAreButtonsCollapsed(v => !v)}
                className="p-1 rounded hover:bg-canvas dark:hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label={areButtonsCollapsed ? 'Mostra filtri' : 'Nascondi filtri'}
              >
                <ChevronRight className={`w-3.5 h-3.5 text-ink-soft transition-transform duration-200 ${areButtonsCollapsed ? '' : 'rotate-90'}`} />
              </button>
            </div>
            {!areButtonsCollapsed && (
              <div className="grid grid-cols-3 gap-2">
                {nestedPieData.macroData.map((item, idx) => {
                  const value = item.value;
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
                    textPercentageClass = 'text-ink dark:text-slate-100 font-extrabold';
                    textAmountClass = 'text-ink-soft dark:text-slate-400';
                  } else {
                    containerClass = 'border-2 border-hairline dark:border-slate-800 bg-canvas/50 dark:bg-slate-900/20 opacity-50 hover:opacity-80';
                    textTitleClass = 'text-ink-soft font-semibold';
                    textPercentageClass = 'text-ink-soft font-extrabold';
                    textAmountClass = 'text-ink-soft/70';
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => toggleMacroCategory(categoryKey)}
                      className={`p-2 rounded-xl flex flex-col justify-between text-left transition-all duration-200 cursor-pointer active:scale-[0.97] h-[64px] ${containerClass}`}
                    >
                      <div className="flex items-center gap-1.5 truncate w-full">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: dotColor, opacity: isSelected ? 1 : 0.4 }} />
                        <span className={`text-3xs truncate uppercase tracking-wider ${textTitleClass}`}>{item.name}</span>
                      </div>
                      <div className="mt-0.5 flex flex-col">
                        <span className={`font-mono text-2xs leading-tight ${textPercentageClass}`}>{actualPercent.toFixed(1)}%</span>
                        <span className={`text-3xs font-mono leading-none ${textAmountClass}`}>{formatEuro(value)}</span>
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
                <span className="text-3xs uppercase tracking-wider text-ink-soft font-bold">Investito</span>
                <span className="text-sm font-black text-ink font-mono">
                  {formatEuro(totalAssetAllocation)}
                </span>
              </div>
            </div>

            {/* Micro Data Legend Column - collapses to a narrow rail on the right, title stays visible */}
            <div className={`h-auto md:h-full flex flex-col md:min-h-0 overflow-visible md:overflow-hidden pb-1 transition-all duration-300 ${isLegendCollapsed ? 'md:max-w-[150px]' : 'w-full'}`}>
              <div className="flex items-center justify-between mb-1.5 shrink-0 gap-2 w-full">
                <span className="text-3xs uppercase font-bold text-ink-soft tracking-wider truncate">
                  Dettaglio Strumenti {selectedMacroCategories.length < 3 && `(${selectedMacroCategories.join(', ')})`}
                </span>
                <div className="flex items-center gap-2 ml-auto shrink-0">
                  {!isLegendCollapsed && selectedMacroCategories.length < 3 && (
                    <button
                      onClick={() => setSelectedMacroCategories(['Azioni', 'Obbligazioni', 'Monetari'])}
                      className="text-3xs text-accent hover:opacity-75 font-bold cursor-pointer transition-colors whitespace-nowrap"
                    >
                      Mostra tutti
                    </button>
                  )}
                  <button
                    onClick={() => setIsLegendCollapsed(v => !v)}
                    className="p-1 rounded hover:bg-canvas dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                    aria-label={isLegendCollapsed ? 'Espandi legenda' : 'Comprimi legenda'}
                  >
                    <ChevronRight className={`w-3.5 h-3.5 text-ink-soft transition-transform duration-200 ${isLegendCollapsed ? '' : 'rotate-90'}`} />
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
                        className="flex items-center justify-between font-semibold py-1 hover:bg-canvas/50 px-1.5 rounded-lg transition-colors text-2xs"
                      >
                        <div className="flex items-center gap-2 truncate max-w-[130px] sm:max-w-[150px] pl-1">
                          <LegendDot color={row.color} pulsing={row.investitoUltimoMese} />
                          <span className="text-ink-soft truncate uppercase font-bold" title={row.name}>{row.name}</span>
                        </div>
                        <div className="flex items-center gap-2 font-mono text-right shrink-0">
                          <span className="text-ink-soft font-extrabold text-3xs">({rowPerc.toFixed(1)}%)</span>
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
                className="mt-2 shrink-0 text-3xs font-bold text-white uppercase tracking-wider py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 dark:bg-sky-600 dark:hover:bg-sky-500 transition-all cursor-pointer md:hover:scale-[1.03]"
              >
                Dettaglio strumenti
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Drawer unico con il dettaglio di TUTTI gli strumenti (raggruppati per macro-gruppo
          di legenda, es. "Globale (sviluppati)" -> World, World SRI). */}
      <SlideOverPanel
        isOpen={showDetailDrawer}
        onClose={() => setShowDetailDrawer(false)}
        title="Capitale Investito per Strumento"
        subtitle={`${formatEuro(totalAssetAllocation)} investiti (non riflette il valore attuale)`}
      >
        <div className="flex-1 overflow-y-auto p-6 space-y-4 pb-28 md:pb-6">
          {legendRows.map((row, idx) => {
                  const rowPerc = totalAssetAllocation > 0 ? (row.value / totalAssetAllocation) * 100 : 0;
                  return (
                    <div key={idx}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2 truncate pl-1">
                          <LegendDot color={row.color} pulsing={row.investitoUltimoMese} className="w-2 h-2" />
                          <span className="text-ink dark:text-white text-xs font-bold truncate" title={row.name}>{row.name}</span>
                        </div>
                        <span className="text-ink dark:text-white text-xs font-mono font-bold shrink-0">
                          ({rowPerc.toFixed(1)}%) {formatEuro(row.value)}
                        </span>
                      </div>
                      {row.kind === 'group' && (
                        <div className="space-y-1.5 pl-3.5">
                          {row.items!.map((sub, subIdx) => {
                            const subPerc = row.value > 0 ? (sub.value / row.value) * 100 : 0;
                            return (
                              <div key={subIdx} className="flex items-center justify-between p-2.5 bg-canvas dark:bg-white/5 rounded-xl border border-hairline dark:border-white/10">
                                <div className="flex items-center gap-2 truncate pl-1">
                                  <LegendDot color={sub.color} pulsing={sub.investitoUltimoMese} />
                                  <span className="text-ink-soft dark:text-slate-400 text-2xs font-medium truncate" title={sub.name}>{sub.name}</span>
                                </div>
                                <div className="flex items-center gap-2 font-mono text-right shrink-0">
                                  <span className="text-ink-soft text-3xs font-bold">({subPerc.toFixed(1)}%)</span>
                                  <span className="text-ink-soft dark:text-slate-400 text-2xs font-semibold">{formatEuro(sub.value)}</span>
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
      </SlideOverPanel>
    </>
  );
}
