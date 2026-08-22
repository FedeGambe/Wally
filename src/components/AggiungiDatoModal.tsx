import React, { useState } from 'react';
import { ArrowUpRight, ArrowDownRight, Fuel, ArrowLeftRight, Repeat } from 'lucide-react';
import Modal from './Modal';
import AggiungiUscitaForm from './uscite/AggiungiUscitaForm';
import AggiungiEntrataForm from './entrate/AggiungiEntrataForm';
import AggiungiConsumoForm from './consumi/AggiungiConsumoForm';
import AggiungiTrasferimentoForm from './trasferimenti/AggiungiTrasferimentoForm';
import AggiungiUsciteRicorrentiForm from './uscite/AggiungiUsciteRicorrentiForm';

type TipoDato = 'entrata' | 'uscita' | 'consumo' | 'trasferimento' | 'usciteRicorrenti' | null;

interface AggiungiDatoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TITOLI: Record<Exclude<TipoDato, null>, string> = {
  entrata: 'Aggiungi Entrata',
  uscita: 'Aggiungi Uscita',
  consumo: 'Aggiungi Consumo',
  trasferimento: 'Aggiungi Trasferimento',
  usciteRicorrenti: 'Uscite Ricorrenti'
};

/**
 * Punto d'ingresso generale (bottone in Panoramica, Fase 1b del piano): prima
 * chiede che tipo di dato inserire, poi mostra lo STESSO form usato dal
 * bottone contestuale della pagina dedicata (AggiungiUscitaForm/
 * AggiungiEntrataForm) — nessuna duplicazione di logica. Consumo e
 * Trasferimento restano disabilitati finché le Fasi 3/5 del piano non
 * esistono (docs/archive/PIANO-INSERIMENTO-DATI.md).
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
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      onBack={tipo ? () => setTipo(null) : undefined}
      title={tipo ? TITOLI[tipo] : 'Aggiungi Dato'}
      maxWidthClass={tipo === 'usciteRicorrenti' ? 'max-w-lg' : 'max-w-md'}
      borderless
    >
      {!tipo && (
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setTipo('entrata')}
            className="flex flex-col items-center justify-center gap-2 p-5 rounded-2xl bg-canvas dark:bg-white/10 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-all cursor-pointer"
          >
            <ArrowUpRight className="w-6 h-6 text-up" />
            <span className="text-sm font-bold text-ink dark:text-slate-200">Entrata</span>
          </button>
          <button
            type="button"
            onClick={() => setTipo('uscita')}
            className="flex flex-col items-center justify-center gap-2 p-5 rounded-2xl bg-canvas dark:bg-white/10 hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-all cursor-pointer"
          >
            <ArrowDownRight className="w-6 h-6 text-orange-600" />
            <span className="text-sm font-bold text-ink dark:text-slate-200">Uscita</span>
          </button>
          <button
            type="button"
            onClick={() => setTipo('consumo')}
            className="flex flex-col items-center justify-center gap-2 p-5 rounded-2xl bg-canvas dark:bg-white/10 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all cursor-pointer"
          >
            <Fuel className="w-6 h-6 text-rose-500" />
            <span className="text-sm font-bold text-ink dark:text-slate-200">Consumo</span>
          </button>
          <button
            type="button"
            onClick={() => setTipo('trasferimento')}
            className="flex flex-col items-center justify-center gap-2 p-5 rounded-2xl bg-canvas dark:bg-white/10 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all cursor-pointer"
          >
            <ArrowLeftRight className="w-6 h-6 text-blue-600" />
            <span className="text-sm font-bold text-ink dark:text-slate-200">Trasferimento</span>
          </button>
          <button
            type="button"
            onClick={() => setTipo('usciteRicorrenti')}
            className="col-span-2 flex items-center justify-center gap-2 p-4 rounded-2xl bg-canvas dark:bg-white/10 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-all cursor-pointer"
          >
            <Repeat className="w-5 h-5 text-amber-600" />
            <span className="text-sm font-bold text-ink dark:text-slate-200">Uscite Ricorrenti</span>
          </button>
        </div>
      )}
      {tipo === 'entrata' && <AggiungiEntrataForm onSaved={handleClose} />}
      {tipo === 'uscita' && <AggiungiUscitaForm onSaved={handleClose} />}
      {tipo === 'consumo' && <AggiungiConsumoForm onSaved={handleClose} />}
      {tipo === 'trasferimento' && <AggiungiTrasferimentoForm onSaved={handleClose} />}
      {tipo === 'usciteRicorrenti' && <AggiungiUsciteRicorrentiForm onSaved={handleClose} />}
    </Modal>
  );
}
