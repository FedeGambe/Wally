import React, { useState } from 'react';
import { TrendingUp, TrendingDown, PiggyBank } from 'lucide-react';
import Modal from './Modal';
import { formatEuro, formatPercent } from '../utils/format';

interface RiepilogoMesePopupProps {
  onClose: (visto: boolean) => void;
  mese: string;
  anno: number;
  record: {
    entrate: number;
    spesePrimarie: number;
    speseSecondarie: number;
    investito: number;
    risparmioNetto: number;
  };
  budget: {
    targetSpeseTotali: number;
    quotaSpeseTotali: number;
    sopraBudget: boolean;
    deltaEuro: number;
    primarie: { target: number; quota: number; deltaEuro: number };
    secondarie: { target: number; quota: number; deltaEuro: number };
    investitoOk: boolean;
    risparmioOk: boolean;
  };
  redistribuzione: {
    risparmio: number;
    investito: number;
    primarie: number;
  } | null;
}

/**
 * Popup "riepilogo mese precedente", mostrato solo nei primi 5 giorni del mese
 * (vedi computeRiepilogoPrecedente in App.tsx) finché l'utente non spunta
 * "Ho preso visione": solo allora viene salvato il flag che lo nasconde per
 * quel mese in sf_riepilogo_visto_<anno>-<meseIdx> (localStorage).
 */
export default function RiepilogoMesePopup({ onClose, mese, anno, record, budget, redistribuzione }: RiepilogoMesePopupProps) {
  const [visto, setVisto] = useState(false);

  // Spese primarie/secondarie: meno si spende meglio è (higherIsBetter=false), stessa
  // scala colore continua usata da Drawer.tsx per le card mensili.
  const speseDinamiche = [
    { label: 'Spese Primarie', value: record.spesePrimarie, ...budget.primarie },
    { label: 'Spese Secondarie', value: record.speseSecondarie, ...budget.secondarie },
  ];

  const tileStatiche = [
    { label: 'Entrate', value: record.entrate, ok: undefined as boolean | undefined },
    { label: 'Investito', value: record.investito, ok: budget.investitoOk },
    { label: 'Risparmio Netto', value: record.risparmioNetto, ok: budget.risparmioOk },
  ];

  const BudgetIcon = budget.sopraBudget ? TrendingUp : TrendingDown;

  return (
    <Modal
      isOpen={true}
      onClose={() => onClose(visto)}
      title={`Riepilogo ${mese} ${anno}`}
      maxWidthClass="max-w-xl"
      blurBackdrop={true}
    >
      {/* Esito budget: uscite totali del mese vs soglia target (primarie+secondarie) */}
      <div className={`flex items-center gap-3 p-4 rounded-2xl border mb-4 ${
        budget.sopraBudget
          ? 'bg-rose-50 border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/30'
          : 'bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/30'
      }`}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
          budget.sopraBudget ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400' : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
        }`}>
          <BudgetIcon className="w-5 h-5" />
        </div>
        <div>
          <span className={`text-lg font-bold block ${budget.sopraBudget ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
            {budget.sopraBudget ? 'Sopra budget' : 'Sotto budget'}
          </span>
          <span className={`text-xs font-normal block ${budget.sopraBudget ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
            di {formatEuro(Math.abs(budget.deltaEuro))}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Spese totali {formatPercent(budget.quotaSpeseTotali)} delle entrate, target {formatPercent(budget.targetSpeseTotali)}
          </span>
        </div>
      </div>

      {/* Proposta di redistribuzione del margine risparmiato, solo informativa: nessuna
          scrittura sui dati, solo un suggerimento su come allocare l'avanzo. Subito sotto
          il riquadro budget perché è una diretta conseguenza dell'esito "sotto budget". */}
      {redistribuzione && (
        <div className="p-4 rounded-2xl border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <PiggyBank className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="text-sm font-bold text-blue-700 dark:text-blue-300">Margine da redistribuire (proposta)</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase block">Risparmio 50%</span>
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200 block mt-1">{formatEuro(redistribuzione.risparmio)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase block">Investito 35%</span>
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200 block mt-1">{formatEuro(redistribuzione.investito)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase block">Primarie 15%</span>
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200 block mt-1">{formatEuro(redistribuzione.primarie)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Riga 1: spese primarie/secondarie, rosso se sopra soglia, verde se sotto (stesso
          binario del riquadro budget qui sopra, non una scala graduata) */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        {speseDinamiche.map(t => {
          const sopra = t.quota > t.target;
          return (
            <div
              key={t.label}
              className={`p-3 rounded-2xl border ${
                sopra
                  ? 'bg-rose-50 border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/30'
                  : 'bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/30'
              }`}
            >
              <span className={`text-[10px] font-bold uppercase tracking-wider block ${sopra ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300'}`}>{t.label}</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-lg font-bold font-display text-slate-800 dark:text-slate-100">{formatEuro(t.value)}</span>
                <span className={`text-xs font-bold ${sopra ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {sopra ? '+' : '-'}{formatEuro(Math.abs(t.deltaEuro))}
                </span>
              </div>
              <span className={`text-[10px] font-semibold mt-0.5 ${sopra ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{formatPercent(t.quota)} (target {formatPercent(t.target)})</span>
            </div>
          );
        })}
      </div>

      {/* Riga 2: entrate/investito/risparmio. Entrate resta neutra (nessuna soglia propria);
          Investito/Risparmio restano grigie ma con un pallino verde/rosso (glow animato)
          accanto al nome se hanno rispettato o meno la loro soglia target. */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {tileStatiche.map(t => (
          <div key={t.label} className="p-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              {t.label}
              {t.ok !== undefined && (
                <span
                  className="w-2 h-2 rounded-full shrink-0 animate-pulse"
                  style={{
                    backgroundColor: t.ok ? '#10b981' : '#f43f5e',
                    boxShadow: `0 0 6px 2px ${t.ok ? 'rgba(16,185,129,0.7)' : 'rgba(244,63,94,0.7)'}`
                  }}
                />
              )}
            </span>
            <span className="text-base font-bold font-display block mt-1 text-slate-700 dark:text-slate-200">{formatEuro(t.value)}</span>
          </div>
        ))}
      </div>

      <label className="flex items-center gap-2 mb-4 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={visto}
          onChange={(e) => setVisto(e.target.checked)}
          className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
        />
        <span className="text-sm text-slate-600 dark:text-slate-300">Ho preso visione</span>
      </label>
      <button
        onClick={() => onClose(visto)}
        disabled={!visto}
        className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer hover:bg-blue-700 transition-colors"
      >
        Chiudi
      </button>
    </Modal>
  );
}
