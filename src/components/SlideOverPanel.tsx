import React, { useId, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { useFocusTrap } from '../hooks/useFocusTrap';

/**
 * Guscio condiviso per tutti i pannelli laterali scorrevoli (drawer) dell'app:
 * overlay di sfondo, pannello con sfondo/bordo theme-aware (bianco in tema
 * chiaro, vetro scuro sfocato in tema scuro), header con titolo/sottotitolo
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

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop Overlay: leggero, il buio "vero" lo dà il pannello (bg scuro
              translucido + backdrop-blur), altrimenti un overlay quasi opaco dietro
              annullava l'effetto vetro facendo vedere solo un blur di colore piatto */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.35 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900 z-[55]"
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
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white dark:bg-[#0b0f19]/95 backdrop-blur-xl shadow-2xl z-[60] flex flex-col h-full border-l border-hairline dark:border-white/10 outline-hidden"
          >
            <div className="p-6 border-b border-hairline dark:border-white/10 flex items-center justify-between shrink-0">
              <div>
                <h3 id={titleId} className="text-lg font-bold text-ink dark:text-slate-100 font-display">{title}</h3>
                {subtitle && <p className="text-xs text-ink-soft mt-1">{subtitle}</p>}
              </div>
              <button
                onClick={onClose}
                aria-label="Chiudi"
                className="w-8 h-8 rounded-lg hover:bg-canvas dark:hover:bg-white/10 flex items-center justify-center text-ink-soft hover:text-ink-soft dark:hover:text-slate-300 transition-colors cursor-pointer shrink-0"
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
  );
}
