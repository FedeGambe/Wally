import React, { useEffect, useState } from 'react';
import { TrendingUp, Sparkles, ClipboardCheck } from 'lucide-react';
import Modal from '../Modal';
import AggiungiInvestimentiRicorrentiForm from './AggiungiInvestimentiRicorrentiForm';
import AggiungiInvestimentoUnaTantumForm from './AggiungiInvestimentoUnaTantumForm';
import VerificaMensileForm from './VerificaMensileForm';

export type TipoInvestimento = 'ricorrenti' | 'unaTantum' | 'verifica' | null;

interface AggiungiInvestimentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Apre il popup già sul form di questo tipo, scelto dai pallini (AggiungiDatoBubbles). */
  tipoIniziale?: TipoInvestimento;
}

const TITOLI: Record<Exclude<TipoInvestimento, null>, string> = {
  ricorrenti: 'Investimenti Ricorrenti',
  unaTantum: 'Investimento Una Tantum',
  verifica: 'Verifica Mensile'
};

/**
 * Popup del "+" della pagina Investimenti: il tipo si sceglie dai pallini
 * (AggiungiDatoBubbles) e qui si apre lo STESSO form usato da Aggiungi Dato
 * (ricorrenti e una tantum), oppure la verifica di fine mese dei broker.
 * Senza `tipoIniziale` mostra ancora la lista di scelta.
 */
export default function AggiungiInvestimentoModal({ isOpen, onClose, tipoIniziale = null }: AggiungiInvestimentoModalProps) {
  const [tipo, setTipo] = useState<TipoInvestimento>(null);

  useEffect(() => {
    if (isOpen && tipoIniziale) setTipo(tipoIniziale);
  }, [isOpen, tipoIniziale]);

  // Come in AggiungiDatoModal: reset ritardato per non smontare il form
  // mentre il popup anima la chiusura.
  const handleClose = () => {
    onClose();
    setTimeout(() => setTipo(null), 300);
  };

  const bottoneClass = "w-full flex items-center gap-3 p-4 rounded-2xl bg-canvas dark:bg-white/10 transition-all text-left";

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      // Aperto dai pallini non c'è una lista a cui tornare: si chiude e basta.
      onBack={tipo && !tipoIniziale ? () => setTipo(null) : undefined}
      title={tipo ? TITOLI[tipo] : 'Aggiungi Investimento'}
      maxWidthClass={tipo ? 'max-w-lg' : 'max-w-md'}
      borderless
      fullScreenOnMobile
    >
      {!tipo && (
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={() => setTipo('ricorrenti')}
            className={`${bottoneClass} hover:bg-sky-50 dark:hover:bg-sky-500/10 cursor-pointer`}
          >
            <TrendingUp className="w-5 h-5 text-sky-600 shrink-0" />
            <span>
              <span className="block text-sm font-bold text-ink dark:text-slate-200">Investimenti Ricorrenti</span>
              <span className="block text-xs text-ink-soft">I preset mensili ancora mancanti questo mese</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => setTipo('unaTantum')}
            className={`${bottoneClass} hover:bg-sky-50 dark:hover:bg-sky-500/10 cursor-pointer`}
          >
            <Sparkles className="w-5 h-5 text-sky-600 shrink-0" />
            <span>
              <span className="block text-sm font-bold text-ink dark:text-slate-200">Investimento Una Tantum</span>
              <span className="block text-xs text-ink-soft">Su uno strumento esistente o nuovo</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => setTipo('verifica')}
            className={`${bottoneClass} hover:bg-sky-50 dark:hover:bg-sky-500/10 cursor-pointer`}
          >
            <ClipboardCheck className="w-5 h-5 text-sky-600 shrink-0" />
            <span>
              <span className="block text-sm font-bold text-ink dark:text-slate-200">Verifica mensile</span>
              <span className="block text-xs text-ink-soft">Saldi, interessi, saveback e rendimento di fine mese</span>
            </span>
          </button>
        </div>
      )}
      {tipo === 'ricorrenti' && <AggiungiInvestimentiRicorrentiForm onSaved={handleClose} />}
      {tipo === 'unaTantum' && <AggiungiInvestimentoUnaTantumForm onSaved={handleClose} />}
      {tipo === 'verifica' && <VerificaMensileForm onSaved={handleClose} />}
    </Modal>
  );
}
