import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ArrowDownRight, ArrowUpRight, TrendingUp, Calendar, Tag, CreditCard } from 'lucide-react';
import { Transaction } from '../data/mockData';
import { formatEuro } from '../utils/format';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  transactions: Transaction[];
  stats?: {
    total: number;
    count: number;
    primaryTotal?: number;
    secondaryTotal?: number;
  };
}

export default function Drawer({
  isOpen,
  onClose,
  title,
  subtitle,
  transactions,
  stats
}: DrawerProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900 z-40 transition-opacity"
          />

          {/* Drawer Container Panel */}
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col h-full border-l border-slate-100"
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-800 font-display">{title}</h3>
                {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick stats summarizing this scope */}
            {stats && (
              <div className="bg-slate-50 p-6 border-b border-slate-100 grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Importo Totale</span>
                  <span className="text-xl font-bold font-display text-slate-800 block mt-1">
                    {formatEuro(stats.total)}
                  </span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Numero Movimenti</span>
                  <span className="text-xl font-bold font-display text-slate-800 block mt-1">
                    {stats.count}
                  </span>
                </div>
                {stats.primaryTotal !== undefined && (
                  <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-xl flex flex-col justify-between text-left">
                    <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider block">Spese Primarie</span>
                    <span className="text-lg font-bold font-display text-indigo-900 block mt-1">
                      {formatEuro(stats.primaryTotal)}
                    </span>
                  </div>
                )}
                {stats.secondaryTotal !== undefined && (
                  <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl flex flex-col justify-between text-left">
                    <span className="text-[10px] text-amber-600 font-bold uppercase tracking-wider block">Spese Secondarie</span>
                    <span className="text-lg font-bold font-display text-amber-900 block mt-1">
                      {formatEuro(stats.secondaryTotal)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Transactions List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                Dettaglio Movimenti
              </h4>

              {transactions.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  Nessuna transazione corrispondente trovata per questo filone.
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.map((t, idx) => (
                    <div
                      key={t.id || `drawer-tx-${idx}-${t.data || ''}-${t.descrizione || ''}`}
                      className="p-3.5 bg-slate-50 hover:bg-slate-100/50 rounded-xl border border-slate-100 transition-all flex items-start gap-3.5"
                    >
                      <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center text-lg shadow-xs shrink-0 border border-slate-100">
                        {t.icon || '💸'}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center justify-between gap-1.5">
                          <p className="text-xs font-semibold text-slate-800 truncate">{t.descrizione}</p>
                          <span className={`text-xs font-semibold shrink-0 ${
                            t.macroCategoria === 'Entrate' ? 'text-emerald-500' : 'text-slate-800'
                          }`}>
                            {t.macroCategoria === 'Entrate' ? '+' : '-'} {formatEuro(t.importo)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-400">
                          <span className="flex items-center gap-0.5 font-medium shrink-0">
                            <Calendar className="w-3 h-3 text-slate-300" />
                            {t.data}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-0.5 truncate uppercase font-mono">
                            <Tag className="w-3 h-3 text-slate-300 shrink-0" />
                            {t.categoria}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <span className="inline-flex items-center gap-1 bg-white border border-slate-100 px-2 py-0.5 rounded-md text-[9px] text-slate-500">
                            <CreditCard className="w-2.5 h-2.5 text-slate-400" />
                            {t.conto}
                          </span>
                          {t.primaria && (
                            <span className="bg-amber-500/10 text-amber-600 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                              Spesa Primaria
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer warning */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 text-center text-[10px] text-slate-400 font-mono">
              Dashboard Finanze • Sincronia Google Sheet
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
