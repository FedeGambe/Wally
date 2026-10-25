import React from 'react';
import { Database, Wallet, ChevronUp, ChevronDown, TrendingUp, Calendar, Award, Coins } from 'lucide-react';
import EuroAmount from '../EuroAmount';

// Estratto da CruscottoGenerale.tsx: le due card raggruppate in alto ("Dati
// Cumulati Storici" e "Performance Anno Selezionato"), 4 KPI in totale.
interface CruscottoKpiGroupsProps {
  CRUSCOTTO_GENERALE: any;
  CRUSCOTTO_ANNO: any;
  calculatedRendimentoAnnuo: number | undefined;
  elapsedMonthsForSelectedYear: number;
  globalSelectedYear: string;
  cruscottoRows: any[];
  formatEuro: (val: any) => string;
  formatPercent: (val: any) => string;
  lastValidRendimento: any;
  investitoMeseCorrente: number;
  portafoglioStimatoAttuale: number;
  contributoMeseCorrente: number;
}

export default function CruscottoKpiGroups({
  CRUSCOTTO_GENERALE,
  CRUSCOTTO_ANNO,
  calculatedRendimentoAnnuo,
  elapsedMonthsForSelectedYear,
  globalSelectedYear,
  cruscottoRows,
  formatEuro,
  formatPercent,
  lastValidRendimento,
  investitoMeseCorrente,
  portafoglioStimatoAttuale,
  contributoMeseCorrente
}: CruscottoKpiGroupsProps) {
  // Confronto con l'anno precedente per i triangolini di Rendimento/Contributo.
  // Se non esiste una riga per l'anno precedente (es. primo anno di dati), il
  // triangolino resta "su" di default (annualUp = true) invece di dare un
  // falso segnale negativo.
  const previousYearRow = cruscottoRows.find((r: any) => Number(r.anno) === Number(globalSelectedYear) - 1);
  const annualUp = !previousYearRow || Number(CRUSCOTTO_ANNO.rendimentoAnnualeEuro || 0) >= Number(previousYearRow.rendimentoAnnualeEuro || 0);
  const isAnnualPositive = Number(CRUSCOTTO_ANNO.rendimentoAnnualeEuro || 0) >= 0;

  // Contributo Anno = somma dei versamenti (non del rendimento) nelle 3 asset class
  // per l'anno selezionato, confrontato con lo stesso totale dell'anno precedente.
  const currentContributoTotale = Number(CRUSCOTTO_ANNO.azioniInvestitoAnno || 0) + Number(CRUSCOTTO_ANNO.obbligazioniInvestitoAnno || 0) + Number(CRUSCOTTO_ANNO.monetariInvestitoAnno || 0);
  const previousContributoTotale = previousYearRow
    ? Number(previousYearRow.azioniInvestitoAnno || 0) + Number(previousYearRow.obbligazioniInvestitoAnno || 0) + Number(previousYearRow.monetariInvestitoAnno || 0)
    : 0;
  const contributoUp = !previousYearRow || currentContributoTotale >= previousContributoTotale;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* GRUPPO 1: DATI CUMULATI STORICI */}
      <div className="bg-canvas/55 dark:bg-[#0c1425]/40 p-4 rounded-3xl border border-hairline/75 dark:border-slate-800/80 shadow-xs space-y-3 text-left">
        <div className="flex items-center justify-between px-1">
          <span className="text-2xs font-black uppercase text-ink-soft dark:text-slate-300 tracking-wider flex items-center gap-1.5">
            <Database className="w-4 h-4 text-ink-soft dark:text-slate-300" />
            Dati Cumulati Storici
          </span>
          <span className="text-3xs bg-accent/15 text-accent px-2 py-0.5 rounded-full font-bold">
            Sempre Aggiornato
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:gap-4">
          {/* Portafoglio Attuale Box */}
          <div className="bg-gradient-to-br from-sky-50 to-white dark:from-sky-950 dark:via-slate-900 dark:to-sky-900 text-ink dark:text-white p-3 sm:p-5 rounded-2xl border border-sky-200 dark:border-sky-900 shadow-xs dark:shadow-[0_0_15px_rgba(14,165,233,0.12)] flex flex-col justify-between min-h-[130px] sm:h-36 transition-all duration-300 hover:border-sky-300 dark:hover:shadow-[0_0_25px_rgba(14,165,233,0.3)] dark:hover:border-sky-800/25 hover:scale-[1.01]">
            <div className="flex justify-between items-start">
              <span className="text-3xs text-sky-700 dark:text-sky-300 font-extrabold uppercase tracking-wider block">Portafoglio Attuale</span>
              <div className="bg-sky-100 dark:bg-sky-950/50 p-1 rounded-lg">
                <Wallet className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              </div>
            </div>
            <div className="mt-2">
              {/* Valore attuale del portafoglio = investito cumulato al mese corrente + rendimento
                  cumulato dell'ultimo mese effettivamente chiuso (lastValidRendimento): il rendimento
                  del mese in corso non e' quasi mai disponibile finche' il broker non chiude il mese. */}
              <span className="text-lg sm:text-2xl font-black font-display text-ink dark:text-white block">
                <EuroAmount value={portafoglioStimatoAttuale} />
              </span>
            </div>
            <div className="border-t border-sky-100 dark:border-sky-800/60 pt-2 mt-2">
              <p className="text-3xs text-sky-600 dark:text-sky-300 font-medium">Investito:   <span className="text-xs font-bold text-ink dark:text-white">{formatEuro(investitoMeseCorrente)}</span></p>
            </div>
          </div>

          {/* Plusvalenza Cumulata Box */}
          <div className={`p-3 sm:p-5 rounded-2xl border flex flex-col justify-between min-h-[130px] sm:h-36 transition-all duration-300 ${CRUSCOTTO_GENERALE.rendimentoCumulativoEuro >= 0
              ? 'bg-emerald-50/10 dark:bg-emerald-950/10 border-emerald-500/30 dark:border-emerald-500/25 shadow-[0_0_15px_rgba(16,185,129,0.12)] hover:shadow-[0_0_25px_rgba(16,185,129,0.32)] hover:border-emerald-500/15 dark:hover:border-emerald-500/10'
              : 'bg-white dark:bg-slate-900/40 border-hairline/80 dark:border-slate-800/60 shadow-xs hover:shadow-md'
            }`}>
            <div className="flex justify-between items-start">
              <span className="text-3xs text-ink-soft dark:text-slate-300 font-extrabold uppercase tracking-wider block">Plusvalenza Cumulata</span>
              <div className="bg-emerald-50 dark:bg-emerald-950/50 p-1 rounded-lg">
                <TrendingUp className="w-4 h-4 text-up" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-lg sm:text-2xl font-extrabold font-display text-up block flex items-center gap-0.5">
                <ChevronUp className="w-5 h-5 shrink-0" />
                <EuroAmount value={CRUSCOTTO_GENERALE.rendimentoCumulativoEuro} />
              </span>
            </div>
            <div className="border-t border-hairline dark:border-slate-800 pt-2 mt-2 flex justify-between items-center text-3xs">
              <span className="text-3xs text-ink-soft dark:text-slate-400 font-medium">Rendimento Totale</span>
              <span className="text-xs bg-up/15 text-up border border-up/30 px-1.5 py-0.5 rounded-lg font-extrabold font-mono">
                {formatPercent(lastValidRendimento?.rendimentoCumulativoPerc)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* GRUPPO 2: PERFORMANCE ANNO SELEZIONATO */}
      <div className="bg-canvas/55 dark:bg-[#0c1425]/40 p-4 rounded-3xl border border-hairline/75 dark:border-slate-800/80 shadow-xs space-y-3 text-left">
        <div className="flex items-center justify-between px-1">
          <span className="text-2xs font-black uppercase text-ink-soft dark:text-slate-300 tracking-wider flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-ink-soft dark:text-slate-300" />
            Performance Anno {globalSelectedYear}
          </span>
          <span className="text-3xs bg-warn/15 text-warn px-2 py-0.5 rounded-full font-bold">
            Anno Selezionato
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:gap-4">
          {/* Rendimento Annuo Box */}
          <div className="bg-white dark:bg-[#0c1425]/90 p-3 sm:p-5 rounded-2xl border border-sky-200 dark:border-sky-900/60 shadow-xs flex flex-col justify-between min-h-[130px] sm:h-36 transition-all duration-300 hover:shadow-md hover:border-sky-300 dark:hover:border-sky-700">
            <div className="flex justify-between items-start">
              <span className="text-3xs text-ink-soft dark:text-slate-300 font-extrabold uppercase tracking-wider block">Rendimento {globalSelectedYear}</span>
              <div className="bg-sky-100 dark:bg-sky-950/50 p-1 rounded-lg">
                <Award className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              </div>
            </div>
            <div className="mt-2">
              <span className={`text-lg sm:text-2xl font-extrabold font-display block flex items-baseline gap-1 flex-wrap ${isAnnualPositive ? 'text-up' : 'text-down'
                }`}>
                <span className="flex items-center gap-0.5">
                  {annualUp ? <ChevronUp className="w-5 h-5 shrink-0" /> : <ChevronDown className="w-5 h-5 shrink-0" />}
                  <EuroAmount value={CRUSCOTTO_ANNO.rendimentoAnnualeEuro} />
                </span>
                <span className={`text-xs font-semibold ${isAnnualPositive ? 'text-up' : 'text-down'}`}>
                  ({formatPercent(calculatedRendimentoAnnuo)})
                </span>
              </span>
            </div>
            <div className="border-t border-sky-100 dark:border-sky-900/60 pt-2 mt-2 flex justify-between items-center text-3xs text-ink-soft">
              <span>Media mensile ({elapsedMonthsForSelectedYear}m)</span>
              <span className="text-xs font-bold text-ink dark:text-slate-300 font-mono">{formatPercent(CRUSCOTTO_ANNO.rendimentoMedioMensilePerc)}</span>
            </div>
          </div>

          {/* Contributo Anno Box */}
          <div className="bg-white dark:bg-[#0c1425]/90 p-3 sm:p-5 rounded-2xl border border-sky-200 dark:border-sky-900/60 shadow-xs flex flex-col justify-between min-h-[130px] sm:h-36 transition-all duration-300 hover:shadow-md hover:border-sky-300 dark:hover:border-sky-700">
            <div className="flex justify-between items-start">
              <span className="text-3xs text-ink-soft dark:text-slate-300 font-extrabold uppercase tracking-wider block">Contributo {globalSelectedYear}</span>
              <div className="bg-sky-100 dark:bg-sky-950/50 p-1 rounded-lg">
                <Coins className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-lg sm:text-2xl font-extrabold font-display text-ink dark:text-slate-100 flex items-center gap-0.5">
                {contributoUp ? (
                  <ChevronUp className="w-5 h-5 shrink-0 text-ink-soft" />
                ) : (
                  <ChevronDown className="w-5 h-5 shrink-0 text-ink-soft" />
                )}
                <EuroAmount value={CRUSCOTTO_ANNO.azioniInvestitoAnno + CRUSCOTTO_ANNO.obbligazioniInvestitoAnno + (CRUSCOTTO_ANNO.monetariInvestitoAnno || 0)} />
              </span>
            </div>
            <div className="border-t border-sky-100 dark:border-sky-900/60 pt-2 mt-2 flex justify-between items-center text-3xs text-ink-soft">
              <span>Contributo Mensile</span>
              <span className="text-xs font-extrabold text-sky-600 dark:text-sky-400 font-mono">
                {formatEuro(contributoMeseCorrente)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
