import React, { useState } from 'react';
import { ArrowUpRight, ArrowDownRight, Fuel, ArrowLeftRight } from 'lucide-react';
import Modal from './Modal';
import AggiungiUscitaForm from './uscite/AggiungiUscitaForm';
import AggiungiEntrataForm from './entrate/AggiungiEntrataForm';

type TipoDato = 'entrata' | 'uscita' | null;

interface AggiungiDatoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TITOLI: Record<Exclude<TipoDato, null>, string> = {
  entrata: 'Aggiungi Entrata',
  uscita: 'Aggiungi Uscita'
};

/**
 * Punto d'ingresso generale (bottone in Panoramica, Fase 1b del piano): prima
 * chiede che tipo di dato inserire, poi mostra lo STESSO form usato dal
 * bottone contestuale della pagina dedicata (AggiungiUscitaForm/
 * AggiungiEntrataForm) — nessuna duplicazione di logica. Consumo e
 * Trasferimento restano disabilitati finché le Fasi 3/5 del piano non
 * esistono (docs/PIANO-INSERIMENTO-DATI.md).
 */
export default function AggiungiDatoModal({ isOpen, onClose }: AggiungiDatoModalProps) {
  const [tipo, setTipo] = useState<TipoDato>(null);

  // Il reset del tipo scelto è ritardato di poco per non "smontare" il form
  // mentre il popup sta ancora animando la chiusura.
  const handleClose = () => {
    onClose();
    setTimeout(() => setTipo(null), 300);
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={tipo ? TITOLI[tipo] : 'Aggiungi Dato'}>
      {!tipo && (
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setTipo('entrata')}
            className="flex flex-col items-center justify-center gap-2 p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:border-emerald-300 dark:hover:border-emerald-500/40 transition-all cursor-pointer"
          >
            <ArrowUpRight className="w-6 h-6 text-emerald-600" />
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Entrata</span>
          </button>
          <button
            type="button"
            onClick={() => setTipo('uscita')}
            className="flex flex-col items-center justify-center gap-2 p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:bg-orange-50 dark:hover:bg-orange-500/10 hover:border-orange-300 dark:hover:border-orange-500/40 transition-all cursor-pointer"
          >
            <ArrowDownRight className="w-6 h-6 text-orange-600" />
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Uscita</span>
          </button>
          <button
            type="button"
            disabled
            className="flex flex-col items-center justify-center gap-2 p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 opacity-40 cursor-not-allowed"
          >
            <Fuel className="w-6 h-6 text-rose-500" />
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Consumo</span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Presto disponibile</span>
          </button>
          <button
            type="button"
            disabled
            className="flex flex-col items-center justify-center gap-2 p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 opacity-40 cursor-not-allowed"
          >
            <ArrowLeftRight className="w-6 h-6 text-blue-600" />
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Trasferimento</span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Presto disponibile</span>
          </button>
        </div>
      )}
      {tipo === 'entrata' && <AggiungiEntrataForm onSaved={handleClose} />}
      {tipo === 'uscita' && <AggiungiUscitaForm onSaved={handleClose} />}
    </Modal>
  );
}
