// ============================================================================
// Pagina "Patrimonio": mostra la fotografia complessiva del patrimonio
// (somma di tutti i conti) e il suo andamento storico nel tempo. Non ha
// filtri anno/mese come le altre pagine: mostra sempre tutto lo storico.
//
// Dati: i totali per conto, le somme aggregate (disponibile/investito/
// impegnato) e la serie storica cumulativa vengono dall'hook
// usePatrimonioData (src/hooks/usePatrimonioData.ts). Qui resta solo la
// composizione della pagina a partire dai sottocomponenti di presentazione.
//
// Sotto-sezioni della pagina:
//  1. Quattro card di patrimonio (Totale / Disponibile / Investito / Accantonato)
//  2. Elenco conti con soglie di allerta, espandibile per il dettaglio di ognuno
//     (PatrimonioContoCard); pulsanti Totale/Disponibile/Investito/Accantonato
//     mostrano solo i conti con quota in quel capitale e il loro importo
//  3. Due grafici a torta: suddivisione capitale e capitale accantonato per conto
//     (PatrimonioCapitalSplitCard, PatrimonioEngagedCapitalCard)
//  4. Grafico ad area "Andamento Finanziario" con zoom, 3 linee attivabili e
//     riepilogo mensile (PatrimonioTrendChart)
// ============================================================================
import {
  Coins,
  TrendingUp,
  PiggyBank,
  BarChart3
} from 'lucide-react';
import FinanceKpiCard from '../components/FinanceKpiCard';
import { useState } from 'react';
import PatrimonioContoCard, { NOMI_FILTRO, importoConto, type FiltroCapitale } from '../components/patrimonio/PatrimonioContoCard';
import PatrimonioCapitalSplitCard from '../components/patrimonio/PatrimonioCapitalSplitCard';
import PatrimonioEngagedCapitalCard from '../components/patrimonio/PatrimonioEngagedCapitalCard';
import PatrimonioTrendChart from '../components/patrimonio/PatrimonioTrendChart';
import { formatEuro, formatPercent } from '../utils/format';
import { usePatrimonioData } from '../hooks/usePatrimonioData';

// Colori dei pulsanti della Sintesi conti, gli stessi delle 4 card in alto
const COLORI_FILTRO: Record<FiltroCapitale, { spento: string; attivo: string }> = {
  totale: {
    spento: 'border-slate-200 text-slate-400 hover:bg-slate-50 dark:border-slate-700/70 dark:text-slate-500 dark:hover:bg-white/5',
    attivo: 'border-slate-400 bg-slate-400 text-white dark:border-slate-600 dark:bg-slate-600/80',
  },
  disponibile: {
    spento: 'border-emerald-200/70 text-emerald-900/40 hover:bg-emerald-50/60 dark:border-emerald-900/50 dark:text-emerald-200/40 dark:hover:bg-emerald-950/30',
    attivo: 'border-emerald-700 bg-emerald-700 text-white dark:border-emerald-600 dark:bg-emerald-700',
  },
  investito: {
    spento: 'border-sky-200/70 text-sky-900/40 hover:bg-sky-50/60 dark:border-sky-900/50 dark:text-sky-200/40 dark:hover:bg-sky-950/30',
    attivo: 'border-sky-700 bg-sky-700 text-white dark:border-sky-600 dark:bg-sky-700',
  },
  accantonato: {
    spento: 'border-amber-200/70 text-amber-900/40 hover:bg-amber-50/60 dark:border-amber-900/50 dark:text-amber-200/40 dark:hover:bg-amber-950/30',
    attivo: 'border-amber-600 bg-amber-600 text-white dark:border-amber-500 dark:bg-amber-700',
  },
};

export default function Patrimonio() {
  const {
    selectedConto, setSelectedConto,
    visibleLines, setVisibleLines,
    localConti,
    totalWealth, totalDisponibile, totalInvestito, totalImpegnato,
    engagedCapitalData,
    COLORS,
    sortedRisparmio,
    cumulativeRisparmioData
  } = usePatrimonioData();

  const isContoSelected = (conto: typeof localConti[number]) =>
    selectedConto ? (conto.id && selectedConto.id === conto.id) || selectedConto.categoria === conto.categoria : false;

  const toggleConto = (conto: typeof localConti[number]) =>
    setSelectedConto(isContoSelected(conto) ? null : conto);

  // Pulsanti della Sintesi conti: Totale mostra tutti i conti col saldo, gli
  // altri solo i conti che hanno una quota in quel capitale, con quella quota.
  const [filtro, setFiltro] = useState<FiltroCapitale>('totale');
  const contiFiltrati = filtro === 'totale'
    ? localConti
    : localConti.filter(c => Math.abs(importoConto(c, filtro)) > 0.005);
  const totaleFiltro = contiFiltrati.reduce((sum, c) => sum + importoConto(c, filtro), 0);
  // Con Totale restano i primi 4 a sinistra come prima; filtrati, metà e metà
  const meta = filtro === 'totale' ? 4 : Math.ceil(contiFiltrati.length / 2);
  const colonne = [contiFiltrati.slice(0, meta), contiFiltrati.slice(meta)];

  return (
    <div className="space-y-6">
      <h1 className="sr-only">Patrimonio</h1>
      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        {/* Totale libero: disponibile + investito, come nella Home; con l'accantonato sotto */}
        <FinanceKpiCard
          id="card-patrimonio"
          type="totale"
          title="Totale libero"
          value={totalDisponibile + totalInvestito}
          icon={BarChart3}
          detail={
            <>
              <span className="w-2 h-2 rounded-full bg-slate-400 animate-pulse"></span>
              <span>Con l'accantonato: <strong className="text-xs sm:text-xs font-black font-mono text-ink dark:text-slate-100 tracking-tight ml-1">{formatEuro(totalDisponibile + totalInvestito + totalImpegnato)}</strong></span>
            </>
          }
        />

        {/* Wealth card 2 - Capitale Disponibile (Indigo) */}
        <FinanceKpiCard
          id="card-liquido"
          type="disponibile"
          title="Capitale Disponibile"
          value={totalDisponibile}
          icon={PiggyBank}
          detail={
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Liquidità immediata sui conti ({formatPercent(totalWealth > 0 ? (totalDisponibile / totalWealth) * 100 : 0)})</span>
            </>
          }
        />

        {/* Wealth card 3 - Capitale Investito (Emerald) */}
        <FinanceKpiCard
          id="card-investito"
          type="investito"
          title="Capitale Investito"
          value={totalInvestito}
          icon={TrendingUp}
          detail={
            <>
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse"></span>
              <span>Strumenti finanziari attivi ({formatPercent(totalWealth > 0 ? (totalInvestito / totalWealth) * 100 : 0)})</span>
            </>
          }
        />

        {/* Wealth card 4 - Capitale Accantonato (Amber) */}
        <FinanceKpiCard
          id="card-impegnato"
          type="impegnato"
          title="Capitale Accantonato"
          value={totalImpegnato}
          icon={Coins}
          detail={
            <>
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              <span>Fondi vincolati o prenotati ({formatPercent(totalWealth > 0 ? (totalImpegnato / totalWealth) * 100 : 0)})</span>
            </>
          }
        />
      </div>

      {/* Accounts Summary Cards List - full width, 2 columns (primi 4 a sx, restanti a dx) */}
      <div className="bg-white p-6 rounded-3xl border border-hairline shadow-sm text-left transition-all duration-300 hover:shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="font-bold text-ink font-display text-base">Sintesi Situazione Conti</h2>
            <p className="text-xs text-ink-soft mt-1">
              {contiFiltrati.length} {contiFiltrati.length === 1 ? 'conto' : 'conti'} ·{' '}
              <strong className="text-sm font-bold font-display text-ink">{formatEuro(totaleFiltro)}</strong>
            </p>
          </div>
          {/* Pulsanti coi colori delle 4 card in alto: bordo sottile e testo colorato,
              attivo con lo sfondo scuro del suo colore */}
          <div className="flex flex-wrap gap-1" role="group" aria-label="Capitale da mostrare">
            {(Object.keys(NOMI_FILTRO) as FiltroCapitale[]).map(f => (
              <button key={f} type="button" onClick={() => setFiltro(f)} aria-pressed={filtro === f}
                className={`px-2.5 py-1 rounded-lg border text-2xs font-semibold transition-colors cursor-pointer ${COLORI_FILTRO[f][filtro === f ? 'attivo' : 'spento']}`}>
                {NOMI_FILTRO[f]}
              </button>
            ))}
          </div>
        </div>

        {contiFiltrati.length === 0 ? (
          <p className="text-sm text-ink-soft py-6 text-center">Nessun conto con capitale {NOMI_FILTRO[filtro].toLowerCase()}.</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {colonne.map((lista, col) => (
              <div key={col} className="space-y-3">
                {lista.map((conto, idx) => (
                  <PatrimonioContoCard
                    key={conto.id || conto.categoria || idx}
                    conto={conto}
                    isSelected={isContoSelected(conto)}
                    onToggle={() => toggleConto(conto)}
                    filtro={filtro}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PatrimonioCapitalSplitCard
          totalDisponibile={totalDisponibile}
          totalInvestito={totalInvestito}
          totalImpegnato={totalImpegnato}
          localConti={localConti}
        />
        <PatrimonioEngagedCapitalCard
          engagedCapitalData={engagedCapitalData}
          colors={COLORS}
          totalImpegnato={totalImpegnato}
        />
      </div>

      <PatrimonioTrendChart
        cumulativeRisparmioData={cumulativeRisparmioData}
        sortedRisparmio={sortedRisparmio}
        visibleLines={visibleLines}
        setVisibleLines={setVisibleLines}
      />
    </div>
  );
}
