import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

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
}

export default function Modal({ isOpen, onClose, title, children, fullScreen = false }: ModalProps) {
  // Reso in portal su document.body (come DropdownMenu): se non lo facessimo,
  // aprendo il popup da dentro una card "bg-white" (es. Impostazioni) il tema
  // scuro applica una regola CSS pensata per box ANNIDATI dentro altri box
  // bianchi (.glass-theme .bg-white .bg-white — sfumatura gialla, quasi
  // trasparente): il popup risultava piccolo e giallastro invece che a schermo
  // intero. Il fullscreen usa in più colori "arbitrari" (bg-[#...]) invece dei
  // nomi semantici bg-white/bg-slate-50, che quelle regole CSS globali
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
            className="fixed inset-0 bg-slate-900 z-[70]"
          />
          <div
            className={`fixed inset-0 z-[71] ${fullScreen ? '' : 'flex items-center justify-center p-4'}`}
            onClick={onClose}
          >
            <motion.div
              initial={fullScreen ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 10 }}
              animate={fullScreen ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
              exit={fullScreen ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className={
                fullScreen
                  ? 'w-full h-full bg-[#ffffff] dark:bg-[#0b0f19] flex flex-col'
                  : 'w-full max-w-md max-h-[90vh] overflow-y-auto bg-white dark:bg-[#0b0f19] rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10'
              }
            >
              <div className={`p-5 border-b border-slate-100 dark:border-white/10 flex items-center justify-between shrink-0 sticky top-0 bg-[#ffffff] dark:bg-[#0b0f19] ${fullScreen ? '' : 'rounded-t-3xl'}`}>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 font-display">{title}</h3>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
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
