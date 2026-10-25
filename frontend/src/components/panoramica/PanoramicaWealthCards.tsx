import React from 'react';
import { TrendingUp, Coins, PiggyBank, BarChart3 } from 'lucide-react';
import FinanceKpiCard from '../FinanceKpiCard';
import { formatEuro, formatPercent } from '../../utils/format';

interface PanoramicaWealthCardsProps {
  capitaleDisponibile: number;
  capitaleInvestito: number;
  capitaleImpegnato: number;
  patrimonioTotale: number;
}

/** Le 4 card patrimonio di Panoramica: Disponibile / Investito / Accantonato /
 * Totale libero (disponibile + investito, senza l'accantonato, che è nella riga sotto).
 * Sempre 2×2: da lg stanno accanto a "Questo mese" e si allungano alla sua altezza. */
export default function PanoramicaWealthCards({
  capitaleDisponibile,
  capitaleInvestito,
  capitaleImpegnato,
  patrimonioTotale
}: PanoramicaWealthCardsProps) {
  // Quota sul patrimonio: con patrimonio a zero (nessun conto ancora) la
  // divisione darebbe "***%" o "∞%", quindi la quota non si mostra.
  const quota = (v: number) => patrimonioTotale > 0 ? ` (${formatPercent((v / patrimonioTotale) * 100)})` : '';

  return (
    <div className="grid grid-cols-2 lg:grid-rows-2 lg:h-full gap-3 sm:gap-6">
      <FinanceKpiCard
        type="disponibile"
        title="Capitale Disponibile"
        value={capitaleDisponibile}
        className="lg:h-full"
        valoreClassName="text-2xl lg:text-[1.75rem] xl:text-[2rem]"
        icon={PiggyBank}
        detail={
          <>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Liquidità pronta all'uso{quota(capitaleDisponibile)}</span>
          </>
        }
      />

      <FinanceKpiCard
        type="investito"
        title="Capitale Investito"
        value={capitaleInvestito}
        className="lg:h-full"
        valoreClassName="text-2xl lg:text-[1.75rem] xl:text-[2rem]"
        icon={TrendingUp}
        detail={
          <>
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse"></span>
            <span>Strumenti finanziari attivi{quota(capitaleInvestito)}</span>
          </>
        }
      />

      <FinanceKpiCard
        type="impegnato"
        title="Capitale Accantonato"
        value={capitaleImpegnato}
        className="lg:h-full"
        valoreClassName="text-2xl lg:text-[1.75rem] xl:text-[2rem]"
        icon={Coins}
        detail={
          <>
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            <span>Fondi vincolati o prenotati{quota(capitaleImpegnato)}</span>
          </>
        }
      />

      <FinanceKpiCard
        type="totale"
        title="Totale libero"
        value={capitaleDisponibile + capitaleInvestito}
        className="lg:h-full"
        valoreClassName="text-2xl lg:text-[1.75rem] xl:text-[2rem]"
        icon={BarChart3}
        detail={
          <>
            <span className="w-2 h-2 rounded-full bg-slate-400 animate-pulse"></span>
            <span>Con l'accantonato: <strong className="text-xs sm:text-xs font-black font-mono text-ink dark:text-slate-100 tracking-tight ml-1">{formatEuro(capitaleDisponibile + capitaleInvestito + capitaleImpegnato)}</strong></span>
          </>
        }
      />
    </div>
  );
}
