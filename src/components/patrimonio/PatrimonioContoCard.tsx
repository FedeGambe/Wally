import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Coins, ShieldAlert, AlertTriangle, Info } from 'lucide-react';
import { formatEuro } from '../../utils/format';
import type { ContoPatrimonio } from '../../data/mockData';

// Estratto da Patrimonio.tsx: singola riga conto nell'elenco "Sintesi Situazione
// Conti", con pannello di dettaglio espandibile al click (saldo, quota
// investimenti/accantonamenti, soglia di allarme se configurata sul foglio).
interface PatrimonioContoCardProps {
  conto: ContoPatrimonio;
  isSelected: boolean;
  onToggle: () => void;
}

export default function PatrimonioContoCard({ conto, isSelected, onToggle }: PatrimonioContoCardProps) {
  const isUnderThreshold = conto.capitaleTotale < conto.sogliaAllarme;
  const limitRemaining = conto.sogliaAllarme - conto.capitaleTotale;

  // hasSoglia = true solo se il conto ha una soglia di allarme configurata sul
  // foglio Google Sheets (campi allarmeSoglia/rimanenteSoglia validi e non
  // entrambi a zero, che indica "soglia non impostata" più che "soglia
  // raggiunta a zero"). Se false, si usa il fallback isUnderThreshold
  // (confronto diretto capitaleTotale vs sogliaAllarme fissa).
  const hasSoglia =
    conto.allarmeSoglia !== undefined &&
    conto.allarmeSoglia !== null &&
    !isNaN(conto.allarmeSoglia) &&
    conto.rimanenteSoglia !== undefined &&
    conto.rimanenteSoglia !== null &&
    !isNaN(conto.rimanenteSoglia) &&
    !(Number(conto.allarmeSoglia) === 0 && Number(conto.rimanenteSoglia) === 0);

  return (
    <div
      id={`conto-row-${conto.id}`}
      className={`rounded-2xl border transition-all duration-200 overflow-hidden ${isSelected
        ? 'border-slate-400 dark:border-slate-500'
        : 'border-slate-50 dark:border-white/10 dark:hover:border-white/30'
        }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isSelected}
        aria-controls={`conto-details-${conto.id}`}
        className="w-full text-left p-4 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-200"
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${hasSoglia
            ? (conto.allarmeSoglia! > 100
              ? 'bg-rose-50 text-rose-500'
              : conto.allarmeSoglia! > 85
                ? 'bg-amber-50 text-amber-500'
                : 'bg-emerald-50 text-emerald-500')
            : (isUnderThreshold ? 'bg-amber-50 text-amber-500' : 'bg-canvas text-ink-soft')
            }`}>
            {hasSoglia && conto.allarmeSoglia! > 100 ? (
              <AlertTriangle className="w-5 h-5 text-rose-500" />
            ) : (isUnderThreshold || (hasSoglia && conto.allarmeSoglia! > 85)) ? (
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            ) : (
              <Coins className="w-5 h-5" />
            )}
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-ink">{conto.categoria}</p>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-2xs text-ink-soft font-medium">
              <span>Disponibile: <strong className="text-ink-soft">{formatEuro(conto.capitaleDisponibile)}</strong></span>
              {conto.capitaleInvestito > 0 && (
                <>
                  <span>•</span>
                  <span>Investito: <strong className="text-ink-soft">{formatEuro(conto.capitaleInvestito)}</strong></span>
                </>
              )}
              {conto.capitaleImpegnato > 0 && (
                <>
                  <span>•</span>
                  <span>Vincolato: <strong className="text-ink-soft">{formatEuro(conto.capitaleImpegnato)}</strong></span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-4 border-t border-slate-50 pt-2.5 sm:border-t-0 sm:pt-0">
          {/* Threshold warnings alerts */}
          {hasSoglia ? (
            <div className="flex items-center shrink-0">
              {conto.allarmeSoglia! > 100 ? (
                <span className="inline-flex items-center gap-1.5 bg-down/15 text-down border border-down/30 text-3xs font-bold px-2.5 py-1 rounded-lg uppercase tracking-wide">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                  Fuori Soglia
                </span>
              ) : conto.allarmeSoglia! > 85 ? (
                <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-600 border border-amber-200 text-3xs font-bold px-2.5 py-1 rounded-lg uppercase tracking-wide">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  Attenzione
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 bg-up/15 text-up border border-up/30 text-3xs font-bold px-2.5 py-1 rounded-lg uppercase tracking-wide">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Sotto Soglia
                </span>
              )}
            </div>
          ) : (
            isUnderThreshold && (
              <div className="text-right">
                <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-600 text-3xs font-bold px-2 py-0.5 rounded-sm uppercase tracking-wide">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Sotto Soglia
                </span>
                <p className="text-3xs text-ink-soft font-mono mt-0.5">Mancano {formatEuro(limitRemaining)}</p>
              </div>
            )
          )}

          <div className="text-right shrink-0">
            <span className="text-ink-soft font-bold text-3xs uppercase block">Capitale Totale</span>
            <span className="text-sm font-bold text-ink font-display block mt-0.5">
              {formatEuro(conto.capitaleTotale)}
            </span>
          </div>
        </div>
      </button>

      {/* Expandable account details inline directly below */}
      <AnimatePresence initial={false}>
        {isSelected && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div id={`conto-details-${conto.id}`} className="conto-panel-espanso px-5 pb-5 pt-4 border-t border-hairline dark:border-white/10 text-ink">
              <div className="flex justify-between items-center border-b border-hairline pb-3 mb-3">
                <div>
                  <h4 className="font-bold font-display text-sm text-ink">{conto.categoria}</h4>
                  <p className="text-3xs text-ink-soft">Analisi approfondita disponibilità del conto</p>
                </div>
                <span className="text-3xs bg-canvas dark:bg-white/10 text-ink-soft dark:text-slate-300 font-bold px-2.5 py-0.5 rounded-full border border-hairline dark:border-white/10">
                  CONTO SELEZIONATO
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-2.5">
                  <div className="flex justify-between border-b border-hairline pb-1.5">
                    <span className="text-ink-soft font-medium">Saldo complessivo:</span>
                    <span className="font-bold text-ink">{formatEuro(conto.capitaleTotale)}</span>
                  </div>
                  <div className="flex justify-between border-b border-hairline pb-1.5">
                    <span className="text-ink-soft font-medium">Liquido disponibile:</span>
                    <span className="font-bold text-up">{formatEuro(conto.capitaleDisponibile)}</span>
                  </div>
                  {hasSoglia && (
                    <div className="flex justify-between border-b border-hairline pb-1.5">
                      <span className="text-ink-soft font-medium">Allarme Soglia (%):</span>
                      <span className={`font-bold ${conto.allarmeSoglia! > 100 ? 'text-down' : conto.allarmeSoglia! > 85 ? 'text-amber-500' : 'text-up'}`}>
                        {conto.allarmeSoglia}%
                      </span>
                    </div>
                  )}
                </div>
                <div className="space-y-2.5">
                  <div className="flex justify-between border-b border-hairline pb-1.5">
                    <span className="text-ink-soft font-medium">Quota investimenti:</span>
                    <span className="font-bold text-sky-600">{formatEuro(conto.capitaleInvestito)}</span>
                  </div>
                  <div className="flex justify-between border-b border-hairline pb-1.5">
                    <span className="text-ink-soft font-medium">Quota accantonamenti:</span>
                    <span className="font-bold text-amber-600">{formatEuro(conto.capitaleImpegnato)}</span>
                  </div>
                  {hasSoglia && (
                    <div className="flex justify-between border-b border-hairline pb-1.5">
                      <span className="text-ink-soft font-medium">Rimanente Soglia:</span>
                      <span className={`font-bold ${conto.allarmeSoglia !== undefined && conto.allarmeSoglia > 100 ? 'text-down' : 'text-ink'}`}>
                        {formatEuro(conto.rimanenteSoglia!)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3.5 border-t border-hairline text-3xs text-ink-soft flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-ink-soft animate-pulse" />
                <span>Valori storici e saldi sincronizzati in tempo reale dal foglio di calcolo Google Sheets.</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
