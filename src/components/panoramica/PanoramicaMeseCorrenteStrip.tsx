import React from 'react';
import { Calendar } from 'lucide-react';
import EuroAmount from '../EuroAmount';
import { formatEuro, formatPercent } from '../../utils/format';
import type { RisparmioMese } from '../../data/mockData';

interface DynamicThresholds {
  primarie: number;
  secondarie: number;
  investiti: number;
  risparmio: number;
}

interface PanoramicaMeseCorrenteStripProps {
  currentMonthData: RisparmioMese;
  prevMonthData: RisparmioMese | undefined;
  dynamicThresholds: DynamicThresholds;
  spendibileResiduo: number | undefined;
  primPerc: number | undefined;
  secPerc: number | undefined;
  invPerc: number | undefined;
  rispPerc: number | undefined;
  entrateDelta: number | undefined;
  speseDelta: number | undefined;
  spesePrimDelta: number | undefined;
  speseSecDelta: number | undefined;
  setActiveView?: (view: string) => void;
}

/**
 * Sezione "Mese Corrente in Evidenza": spendibile residuo, i 4 mini-widget
 * Risparmio/Investito/Spese Primarie/Secondarie (con scostamento dalla soglia
 * dinamica sia in € che in punti percentuali) e la riga di delta % vs il mese
 * precedente. Nascosta su mobile: il suo contenuto è già coperto dal widget
 * "Rendiconto Mese Corrente" (PanoramicaRendicontoWidget) e dal suo popup di
 * dettaglio.
 */
export default function PanoramicaMeseCorrenteStrip({
  currentMonthData,
  prevMonthData,
  dynamicThresholds,
  spendibileResiduo,
  primPerc,
  secPerc,
  invPerc,
  rispPerc,
  entrateDelta,
  speseDelta,
  spesePrimDelta,
  speseSecDelta,
  setActiveView
}: PanoramicaMeseCorrenteStripProps) {
  // Widget "Risparmio & Investito": somma i due sotto-widget, quota % sulle
  // entrate e soglia combinata (somma delle due soglie dinamiche).
  const rispInvTotale = (currentMonthData.risparmioNetto || 0) + (currentMonthData.investito || 0);
  const rispInvPerc = currentMonthData.entrate > 0 ? (rispInvTotale / currentMonthData.entrate) * 100 : undefined;
  const rispInvSoglia = dynamicThresholds.risparmio + dynamicThresholds.investiti;

  // Widget "Spese": somma Primarie + Secondarie, quota % e soglia combinata.
  const speseTotaleWidget = (currentMonthData.spesePrimarie || 0) + (currentMonthData.speseSecondarie || 0);
  const spesePerc = currentMonthData.entrate > 0 ? (speseTotaleWidget / currentMonthData.entrate) * 100 : undefined;
  const speseSoglia = dynamicThresholds.primarie + dynamicThresholds.secondarie;

  // Scostamento dalla soglia dei 4 mini-widget, sia in euro (accanto
  // all'importo) che in punti percentuali (nel badge Sotto/Fuori Soglia, che
  // prima ripeteva la stessa quota già mostrata sopra invece di dire "di
  // quanto"). Positivo = soglia rispettata (margine), negativo = soglia
  // sforata. Per risparmio/investito "di più è meglio" (quota - target); per
  // le spese vale il contrario (target - quota).
  const entrateMese = currentMonthData.entrate;
  const rispDeltaEuro = (currentMonthData.risparmioNetto !== undefined && entrateMese)
    ? currentMonthData.risparmioNetto - (entrateMese * dynamicThresholds.risparmio / 100) : undefined;
  const invDeltaEuro = (currentMonthData.investito !== undefined && entrateMese)
    ? currentMonthData.investito - (entrateMese * dynamicThresholds.investiti / 100) : undefined;
  const primDeltaEuro = (currentMonthData.spesePrimarie !== undefined && entrateMese)
    ? (entrateMese * dynamicThresholds.primarie / 100) - currentMonthData.spesePrimarie : undefined;
  const secDeltaEuro = (currentMonthData.speseSecondarie !== undefined && entrateMese)
    ? (entrateMese * dynamicThresholds.secondarie / 100) - currentMonthData.speseSecondarie : undefined;
  const rispPercDelta = rispPerc !== undefined ? rispPerc - dynamicThresholds.risparmio : undefined;
  const invPercDelta = invPerc !== undefined ? invPerc - dynamicThresholds.investiti : undefined;
  const primPercDelta = primPerc !== undefined ? dynamicThresholds.primarie - primPerc : undefined;
  const secPercDelta = secPerc !== undefined ? dynamicThresholds.secondarie - secPerc : undefined;

  return (
    <div className="hidden md:block bg-white p-6 rounded-3xl border border-hairline shadow-sm text-left">
      <h3 className="text-base font-bold text-ink font-display mb-4 flex items-center gap-2">
        <Calendar className="w-5 h-5 text-blue-600" />
        <span className="hidden md:inline">Mese Corrente in Evidenza:</span>
        <span className="md:hidden">Mese Corrente:</span>
        <span className="text-blue-600 font-extrabold capitalize">
          {currentMonthData.mese} <span className="hidden md:inline">{currentMonthData.anno}</span><span className="md:hidden">{String(currentMonthData.anno).slice(2)}</span>
        </span>
      </h3>

      {/* Spendibile residuo: colonna "Spendibile" del foglio Risparmio meno
          le spese secondarie già sostenute nel mese, cioè quanto resta
          ancora da spendere ora. */}
      <div className="mb-5 p-4 rounded-2xl border border-hairline dark:border-slate-700 bg-canvas dark:bg-slate-800 flex items-center justify-between gap-4">
        <div>
          <span className="text-3xs text-ink-soft dark:text-slate-400 font-bold uppercase tracking-wider block">Ancora Spendibile questo Mese</span>
          <span className="text-xs text-ink-soft dark:text-slate-500 mt-0.5 block">Spendibile − Spese Secondarie</span>
        </div>
        <span className={`text-2xl font-black font-display shrink-0 ${spendibileResiduo !== undefined && spendibileResiduo < 0 ? 'text-down' : 'text-ink dark:text-slate-100'}`}>
          {formatEuro(spendibileResiduo)} <span className="text-sm text-ink-soft dark:text-slate-500 font-bold">/ {formatEuro(currentMonthData.spendibile)}</span>
        </span>
      </div>

      {/* Nota sul verso dei confronti con la soglia: per Risparmio e
          Investito "di più è meglio" quindi il confronto è >= (raggiunto
          o superato il target = verde). Per le Spese (Primarie/Secondarie)
          vale il contrario: "di meno è meglio", quindi il confronto è <=
          (sotto la soglia = verde, sopra = allerta rossa). */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
        {/* Widget Risparmio & Investito */}
        <div className="p-5 rounded-2xl border border-hairline">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-slate-300 font-bold">Risparmio & Investito</span>
            <div className="text-right">
              <span className="font-extrabold font-display text-ink block">{formatEuro(rispInvTotale)}</span>
              <span className={`text-3xs font-bold ${rispInvPerc !== undefined && rispInvPerc >= rispInvSoglia ? 'text-up' : 'text-down'}`}>
                {formatPercent(rispInvPerc)} / Soglia {rispInvSoglia}%
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-6">
            {/* Risparmio */}
            <button
              type="button"
              onClick={() => setActiveView?.('patrimonio')}
              className="w-full text-left p-5 rounded-2xl bg-canvas dark:bg-slate-800 border border-hairline dark:border-slate-700 flex flex-col justify-between h-32 cursor-pointer hover:border-accent transition-colors"
            >
              <div>
                <span className="text-3xs text-ink-soft font-bold uppercase tracking-wider block">Risparmio</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-extrabold font-display text-ink block">
                    <EuroAmount value={currentMonthData.risparmioNetto} />
                  </span>
                  {rispDeltaEuro !== undefined && (
                    <span className={`text-xs font-bold ${rispDeltaEuro >= 0 ? 'text-up' : 'text-down'}`}>
                      {rispDeltaEuro >= 0 ? '+' : '-'}{formatEuro(Math.abs(rispDeltaEuro))}
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-auto flex items-center justify-between pt-2">
                <span className="text-xs text-ink-soft font-medium">Quota: <strong className="font-bold text-ink">{formatPercent(rispPerc)}</strong></span>
                <span className={`inline-flex items-center gap-0.5 text-3xs font-bold px-2 py-0.5 rounded-full border ${rispPercDelta !== undefined && rispPercDelta >= 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' : 'bg-rose-50 text-rose-700 border-rose-200/60'}`}>
                  {rispPercDelta !== undefined && rispPercDelta >= 0 ? `Sopra Soglia ✓ ${formatPercent(rispPercDelta, { signed: true })}` : `Fuori Soglia ✗ ${formatPercent(rispPercDelta, { signed: true })}`}
                </span>
              </div>
            </button>

            {/* Investito */}
            <button
              type="button"
              onClick={() => setActiveView?.('investimenti')}
              className="w-full text-left p-5 rounded-2xl bg-canvas dark:bg-slate-800 border border-hairline dark:border-slate-700 flex flex-col justify-between h-32 cursor-pointer hover:border-accent transition-colors"
            >
              <div>
                <span className="text-3xs text-ink-soft font-bold uppercase tracking-wider block">Investito</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-extrabold font-display text-ink block">
                    <EuroAmount value={currentMonthData.investito} />
                  </span>
                  {invDeltaEuro !== undefined && (
                    <span className={`text-xs font-bold ${invDeltaEuro >= 0 ? 'text-up' : 'text-down'}`}>
                      {invDeltaEuro >= 0 ? '+' : '-'}{formatEuro(Math.abs(invDeltaEuro))}
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-auto flex items-center justify-between pt-2">
                <span className="text-xs text-ink-soft font-medium">Quota: <strong className="font-bold text-ink">{formatPercent(invPerc)}</strong></span>
                <span className={`inline-flex items-center gap-0.5 text-3xs font-bold px-2 py-0.5 rounded-full border ${invPercDelta !== undefined && invPercDelta >= 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' : 'bg-rose-50 text-rose-700 border-rose-200/60'}`}>
                  {invPercDelta !== undefined && invPercDelta >= 0 ? `Sopra Soglia ✓ ${formatPercent(invPercDelta, { signed: true })}` : `Fuori Soglia ✗ ${formatPercent(invPercDelta, { signed: true })}`}
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Widget Spese */}
        <div className="p-5 rounded-2xl border border-hairline">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-slate-300 font-bold">Spese</span>
            <div className="text-right">
              <span className="font-extrabold font-display text-ink block">{formatEuro(speseTotaleWidget)}</span>
              <span className={`text-3xs font-bold ${spesePerc !== undefined && spesePerc <= speseSoglia ? 'text-up' : 'text-down'}`}>
                {formatPercent(spesePerc)} / Soglia {speseSoglia}%
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-6">
            {/* Spese Primarie */}
            <button
              type="button"
              onClick={() => setActiveView?.('uscite')}
              className="w-full text-left p-5 rounded-2xl bg-canvas dark:bg-slate-800 border border-hairline dark:border-slate-700 flex flex-col justify-between h-32 cursor-pointer hover:border-accent transition-colors"
            >
              <div>
                <span className="text-3xs text-ink-soft font-bold uppercase tracking-wider block">Spese Primarie</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-extrabold font-display text-ink block">
                    <EuroAmount value={currentMonthData.spesePrimarie} />
                  </span>
                  {primDeltaEuro !== undefined && (
                    <span className={`text-xs font-bold ${primDeltaEuro >= 0 ? 'text-up' : 'text-down'}`}>
                      {primDeltaEuro >= 0 ? '+' : '-'}{formatEuro(Math.abs(primDeltaEuro))}
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-auto flex items-center justify-between pt-2">
                <span className="text-xs text-ink-soft font-medium">Quota: <strong className="font-bold text-ink">{formatPercent(primPerc)}</strong></span>
                <span className={`inline-flex items-center gap-0.5 text-3xs font-bold px-2 py-0.5 rounded-full border ${primPercDelta !== undefined && primPercDelta >= 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' : 'bg-rose-50 text-rose-700 border-rose-200/60'}`}>
                  {primPercDelta !== undefined && primPercDelta >= 0 ? `Sotto Soglia ✓ ${formatPercent(primPercDelta, { signed: true })}` : `Fuori Soglia ✗ ${formatPercent(primPercDelta, { signed: true })}`}
                </span>
              </div>
            </button>

            {/* Spese Secondarie */}
            <button
              type="button"
              onClick={() => setActiveView?.('uscite')}
              className="w-full text-left p-5 rounded-2xl bg-canvas dark:bg-slate-800 border border-hairline dark:border-slate-700 flex flex-col justify-between h-32 cursor-pointer hover:border-accent transition-colors"
            >
              <div>
                <span className="text-3xs text-ink-soft font-bold uppercase tracking-wider block">Spese Secondarie</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-extrabold font-display text-ink block">
                    <EuroAmount value={currentMonthData.speseSecondarie} />
                  </span>
                  {secDeltaEuro !== undefined && (
                    <span className={`text-xs font-bold ${secDeltaEuro >= 0 ? 'text-up' : 'text-down'}`}>
                      {secDeltaEuro >= 0 ? '+' : '-'}{formatEuro(Math.abs(secDeltaEuro))}
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-auto flex items-center justify-between pt-2">
                <span className="text-xs text-ink-soft font-medium">Quota: <strong className="font-bold text-ink">{formatPercent(secPerc)}</strong></span>
                <span className={`inline-flex items-center gap-0.5 text-3xs font-bold px-2 py-0.5 rounded-full border ${secPercDelta !== undefined && secPercDelta >= 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' : 'bg-rose-50 text-rose-700 border-rose-200/60'}`}>
                  {secPercDelta !== undefined && secPercDelta >= 0 ? `Sotto Soglia ✓ ${formatPercent(secPercDelta, { signed: true })}` : `Fuori Soglia ✗ ${formatPercent(secPercDelta, { signed: true })}`}
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Delta change vs previous month */}
      <div className="mt-4 p-4 bg-canvas dark:bg-slate-800 rounded-2xl border border-hairline dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-3xs font-extrabold text-ink dark:text-slate-200 uppercase tracking-wider bg-slate-200 dark:bg-slate-700 px-2.5 py-1 rounded-lg">
            Delta vs {prevMonthData ? `${prevMonthData.mese} ${prevMonthData.anno}` : 'Mese Precedente'}
          </span>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-ink-soft dark:text-slate-400 font-semibold">Entrate:</span>
            <span className={`font-black text-xs px-2.5 py-0.5 rounded-md ${entrateDelta !== undefined && entrateDelta >= 0 ? "bg-up/15 text-up" : "bg-down/15 text-down"}`}>
              {entrateDelta !== undefined && entrateDelta >= 0 ? '+' : ''}{formatPercent(entrateDelta)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-ink-soft dark:text-slate-400 font-semibold">Uscite Totali:</span>
            <span className={`font-black text-xs px-2.5 py-0.5 rounded-md ${speseDelta !== undefined && speseDelta <= 0 ? "bg-up/15 text-up" : "bg-down/15 text-down"}`}>
              {speseDelta !== undefined && speseDelta >= 0 ? '+' : ''}{formatPercent(speseDelta)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-ink-soft dark:text-slate-400 font-semibold">Spese Primarie:</span>
            <span className={`font-black text-xs px-2.5 py-0.5 rounded-md ${spesePrimDelta !== undefined && spesePrimDelta <= 0 ? "bg-up/15 text-up" : "bg-down/15 text-down"}`}>
              {spesePrimDelta !== undefined && spesePrimDelta >= 0 ? '+' : ''}{formatPercent(spesePrimDelta)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-ink-soft dark:text-slate-400 font-semibold">Spese Secondarie:</span>
            <span className={`font-black text-xs px-2.5 py-0.5 rounded-md ${speseSecDelta !== undefined && speseSecDelta <= 0 ? "bg-up/15 text-up" : "bg-down/15 text-down"}`}>
              {speseSecDelta !== undefined && speseSecDelta >= 0 ? '+' : ''}{formatPercent(speseSecDelta)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
