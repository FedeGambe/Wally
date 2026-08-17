import React, { useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { useFocusTrap } from '../hooks/useFocusTrap';

/**
 * Popup centrato (non fullscreen, non un drawer laterale) — usato dai form di
 * inserimento manuale (Aggiungi Uscita/Entrata/...). A differenza di
 * SlideOverPanel (che scorre da destra, per pannelli di dettaglio/lettura),
 * questo è pensato per form brevi e azioni puntuali.
 */
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** Popup a tutto schermo invece che centrato in una card piccola — per
   * editor più ampi (es. Impostazioni → Dati Base) dove il form breve non basta. */
  fullScreen?: boolean;
  /** Larghezza massima della card centrata (ignorata se fullScreen). Default 'max-w-md'. */
  maxWidthClass?: string;
  /** Sfoca (backdrop-blur) il contenuto sotto l'overlay invece del solo scurimento. */
  blurBackdrop?: boolean;
}

export default function Modal({ isOpen, onClose, title, children, fullScreen = false, maxWidthClass = 'max-w-md', blurBackdrop = false }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useFocusTrap(isOpen, onClose, panelRef);

  // Reso in portal su document.body (come DropdownMenu): se non lo facessimo,
  // aprendo il popup da dentro una card "bg-white" (es. Impostazioni) il tema
  // scuro applica una regola CSS pensata per box ANNIDATI dentro altri box
  // bianchi (.glass-theme .bg-white .bg-white — sfumatura gialla, quasi
  // trasparente): il popup risultava piccolo e giallastro invece che a schermo
  // intero. Il fullscreen usa in più colori "arbitrari" (bg-[#...]) invece dei
  // nomi semantici bg-white/bg-canvas, che quelle regole CSS globali
  // (index.css, tutte con !important) intercettano per nome di classe.
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className={`fixed inset-0 bg-slate-900 z-[70] ${blurBackdrop ? 'backdrop-blur-md' : ''}`}
          />
          <div
            className={`fixed inset-0 z-[71] ${fullScreen ? '' : 'flex items-center justify-center p-4'}`}
            onClick={onClose}
          >
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              tabIndex={-1}
              initial={fullScreen ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 10 }}
              animate={fullScreen ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
              exit={fullScreen ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className={
                fullScreen
                  ? 'w-full h-full bg-[#ffffff] dark:bg-[#0b0f19] flex flex-col outline-hidden'
                  : `w-full ${maxWidthClass} max-h-[90vh] overflow-y-auto bg-white dark:bg-[#0b0f19] rounded-3xl shadow-2xl border border-hairline dark:border-white/10 outline-hidden`
              }
            >
              <div className={`p-5 border-b border-hairline dark:border-white/10 flex items-center justify-between shrink-0 sticky top-0 bg-[#ffffff] dark:bg-[#0b0f19] ${fullScreen ? '' : 'rounded-t-3xl'}`}>
                <h3 id={titleId} className="text-base font-bold text-ink dark:text-slate-100 font-display">{title}</h3>
                <button
                  onClick={onClose}
                  aria-label="Chiudi"
                  className="w-9 h-9 rounded-xl bg-down/15 border border-down/30 hover:bg-down/25 flex items-center justify-center text-rose-600 dark:text-rose-400 transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className={`p-5 ${fullScreen ? 'flex-1 overflow-y-auto' : ''}`}>{children}</div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
