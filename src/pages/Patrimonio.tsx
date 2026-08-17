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
//     (PatrimonioContoCard)
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
import PatrimonioContoCard from '../components/patrimonio/PatrimonioContoCard';
import PatrimonioCapitalSplitCard from '../components/patrimonio/PatrimonioCapitalSplitCard';
import PatrimonioEngagedCapitalCard from '../components/patrimonio/PatrimonioEngagedCapitalCard';
import PatrimonioTrendChart from '../components/patrimonio/PatrimonioTrendChart';
import { formatEuro, formatPercent } from '../utils/format';
import { usePatrimonioData } from '../hooks/usePatrimonioData';

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

  return (
    <div className="space-y-6">
      <h1 className="sr-only">Patrimonio</h1>
      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        {/* Wealth card 1 - Capitale Totale (Slate-900) */}
        <FinanceKpiCard
          id="card-patrimonio"
          type="totale"
          title="Capitale Totale"
          value={totalDisponibile + totalInvestito}
          icon={BarChart3}
          detail={
            <>
              <span className="w-2 h-2 rounded-full bg-slate-400 animate-pulse"></span>
              <span>Incluso Accantonamento: <strong className="text-xs sm:text-[13px] font-black font-mono text-ink dark:text-slate-100 tracking-tight ml-1">{formatEuro(totalDisponibile + totalInvestito + totalImpegnato)}</strong></span>
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
        <h3 className="font-bold text-ink font-display text-base mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <span>Sintesi Situazione Conti</span>
          <span className="text-[10px] text-ink-soft font-mono">Soglia critica di allerta: {formatEuro(5000)}</span>
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-3">
            {localConti.slice(0, 4).map((conto, idx) => (
              <PatrimonioContoCard
                key={conto.id || conto.categoria || idx}
                conto={conto}
                isSelected={isContoSelected(conto)}
                onToggle={() => toggleConto(conto)}
              />
            ))}
          </div>
          <div className="space-y-3">
            {localConti.slice(4).map((conto, idx) => (
              <PatrimonioContoCard
                key={conto.id || conto.categoria || idx}
                conto={conto}
                isSelected={isContoSelected(conto)}
                onToggle={() => toggleConto(conto)}
              />
            ))}
          </div>
        </div>
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
