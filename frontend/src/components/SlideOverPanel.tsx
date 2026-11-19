import React, { useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { usePannelloAperto } from '../hooks/useBolleAperte';

/**
 * Guscio condiviso per tutti i pannelli laterali scorrevoli (drawer) dell'app:
 * velo di sfondo, pannello con sfondo/bordo theme-aware (bianco in tema
 * chiaro, lo stesso vetro scuro dei popup di Modal.tsx in tema scuro), header con titolo/sottotitolo
 * e bottone di chiusura. Il contenuto (`children`) e un `footer` opzionale
 * restano a carico di chi lo usa — questo componente non sa nulla del
 * dominio (transazioni, strumenti, ecc.), solo struttura e layout.
 */
interface SlideOverPanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export default function SlideOverPanel({ isOpen, onClose, title, subtitle, children, footer }: SlideOverPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useFocusTrap(isOpen, onClose, panelRef);
  // Il "+" in basso a destra starebbe sopra il pannello: sparisce finché è aperto.
  usePannelloAperto(isOpen);

  // In portal su <body> come Modal.tsx: le pagine entrano con un'animazione a
  // transform (e molte card hanno backdrop-filter), che renderebbe il `fixed`
  // relativo alla pagina o alla card invece che allo schermo. Fuori dal
  // contenitore dell'app si perde la classe glass-theme (tema scuro, App.tsx)
  // che serve alle card dentro il pannello: la si rimette qui, come in
  // AggiungiDatoBubbles.
  const scuro = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  return createPortal(
    <div className={scuro ? 'glass-theme' : undefined}>
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Velo sotto il pannello: lo stesso dei popup di inserimento (Modal.tsx),
              scuro e sfocato, così le cifre della pagina non si leggono attraverso
              il vetro del pannello. */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/60 backdrop-blur-md z-[55]"
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fondo-popup fixed right-0 top-0 bottom-0 w-full max-w-md bg-[#ffffff] dark:bg-[#0b0f19] shadow-2xl z-[60] flex flex-col h-full border-l border-hairline dark:border-white/10 outline-hidden"
          >
            {/* Intestazione come quella di Modal.tsx (stesso padding, titolo e bottone
                chiudi rosso), così pannelli laterali e popup sembrano della stessa app.
                Su telefono il pannello è a tutta altezza: rispetta il notch in alto. */}
            <div className="p-5 pt-[max(1.25rem,env(safe-area-inset-top))] md:pt-5 border-b border-hairline dark:border-white/10 flex items-start gap-3 shrink-0">
              <div className="flex-1 min-w-0">
                <h3 id={titleId} className="text-base font-bold text-ink dark:text-slate-100 font-display text-balance">{title}</h3>
                {subtitle && <p className="text-xs text-ink-soft dark:text-slate-400 mt-1">{subtitle}</p>}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Chiudi"
                className="w-9 h-9 rounded-xl bg-down/15 hover:bg-down/25 border border-down/30 flex items-center justify-center text-rose-600 dark:text-rose-400 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {children}

            {footer && <div className="shrink-0">{footer}</div>}
          </motion.div>
        </>
      )}
    </AnimatePresence>
    </div>,
    document.body
  );
}
