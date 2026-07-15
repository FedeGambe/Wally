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
      <div
        onClick={onToggle}
        className="p-4 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-200"
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${hasSoglia
            ? (conto.allarmeSoglia! > 100
              ? 'bg-rose-50 text-rose-500'
              : conto.allarmeSoglia! > 85
                ? 'bg-amber-50 text-amber-500'
                : 'bg-emerald-50 text-emerald-500')
            : (isUnderThreshold ? 'bg-amber-50 text-amber-500' : 'bg-slate-50 text-slate-600')
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
            <p className="text-sm font-semibold text-slate-800">{conto.categoria}</p>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-[11px] text-slate-400 font-medium">
              <span>Disponibile: <strong className="text-slate-600">{formatEuro(conto.capitaleDisponibile)}</strong></span>
              {conto.capitaleInvestito > 0 && (
                <>
                  <span>•</span>
                  <span>Investito: <strong className="text-slate-600">{formatEuro(conto.capitaleInvestito)}</strong></span>
                </>
              )}
              {conto.capitaleImpegnato > 0 && (
                <>
                  <span>•</span>
                  <span>Vincolato: <strong className="text-slate-600">{formatEuro(conto.capitaleImpegnato)}</strong></span>
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
                <span className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-600 border border-rose-200 text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wide">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                  Fuori Soglia
                </span>
              ) : conto.allarmeSoglia! > 85 ? (
                <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-600 border border-amber-200 text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wide">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  Attenzione
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-600 border border-emerald-200 text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wide">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Sotto Soglia
                </span>
              )}
            </div>
          ) : (
            isUnderThreshold && (
              <div className="text-right">
                <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-600 text-[9px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wide">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Sotto Soglia
                </span>
                <p className="text-[9px] text-slate-400 font-mono mt-0.5">Mancano {formatEuro(limitRemaining)}</p>
              </div>
            )
          )}

          <div className="text-right shrink-0">
            <span className="text-slate-400 font-bold text-[9px] uppercase block">Capitale Totale</span>
            <span className="text-sm font-bold text-slate-800 font-display block mt-0.5">
              {formatEuro(conto.capitaleTotale)}
            </span>
          </div>
        </div>
      </div>

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
            <div className="conto-panel-espanso px-5 pb-5 pt-4 border-t border-slate-200 dark:border-white/10 text-slate-800">
              <div className="flex justify-between items-center border-b border-slate-200 pb-3 mb-3">
                <div>
                  <h4 className="font-bold font-display text-sm text-slate-800">{conto.categoria}</h4>
                  <p className="text-[10px] text-slate-500">Analisi approfondita disponibilità del conto</p>
                </div>
                <span className="text-[10px] bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 font-bold px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-white/10">
                  CONTO SELEZIONATO
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-2.5">
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-500 font-medium">Saldo complessivo:</span>
                    <span className="font-bold text-slate-800">{formatEuro(conto.capitaleTotale)}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-500 font-medium">Liquido disponibile:</span>
                    <span className="font-bold text-emerald-600">{formatEuro(conto.capitaleDisponibile)}</span>
                  </div>
                  {hasSoglia && (
                    <div className="flex justify-between border-b border-slate-100 pb-1.5">
                      <span className="text-slate-500 font-medium">Allarme Soglia (%):</span>
                      <span className={`font-bold ${conto.allarmeSoglia! > 100 ? 'text-rose-600' : conto.allarmeSoglia! > 85 ? 'text-amber-500' : 'text-emerald-600'}`}>
                        {conto.allarmeSoglia}%
                      </span>
                    </div>
                  )}
                </div>
                <div className="space-y-2.5">
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-500 font-medium">Quota investimenti:</span>
                    <span className="font-bold text-sky-600">{formatEuro(conto.capitaleInvestito)}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-500 font-medium">Quota accantonamenti:</span>
                    <span className="font-bold text-amber-600">{formatEuro(conto.capitaleImpegnato)}</span>
                  </div>
                  {hasSoglia && (
                    <div className="flex justify-between border-b border-slate-100 pb-1.5">
                      <span className="text-slate-500 font-medium">Rimanente Soglia:</span>
                      <span className={`font-bold ${conto.allarmeSoglia !== undefined && conto.allarmeSoglia > 100 ? 'text-rose-600' : 'text-slate-700'}`}>
                        {formatEuro(conto.rimanenteSoglia!)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3.5 border-t border-slate-100 text-[10px] text-slate-500 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-slate-400 animate-pulse" />
                <span>Valori storici e saldi sincronizzati in tempo reale dal foglio di calcolo Google Sheets.</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
