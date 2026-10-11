import React from 'react';
import { createPortal } from 'react-dom';
import { Plus } from 'lucide-react';

interface FloatingAddButtonProps {
  label: string;
  onClick: () => void;
  /** Classi colore del bottone (sfondo + hover), una per pagina. */
  colorClass: string;
}

/**
 * Bottone "Aggiungi ..." fisso in basso a destra, comune a tutte le pagine.
 * Su mobile è un cerchio con il solo "+" sopra la barra di navigazione in
 * basso; da md in su mostra anche l'etichetta. Reso in portal su body: le
 * pagine hanno animazioni d'ingresso con transform, che renderebbero il
 * `fixed` relativo alla pagina invece che alla finestra.
 */
export default function FloatingAddButton({ label, onClick, colorClass }: FloatingAddButtonProps) {
  return createPortal(
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`fixed z-40 right-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] md:right-8 md:bottom-8 inline-flex items-center justify-center gap-2 w-14 h-14 md:w-auto md:h-auto md:px-5 md:py-3.5 rounded-full text-white text-sm font-bold shadow-lg hover:shadow-xl transition-all cursor-pointer ${colorClass}`}
    >
      <Plus className="w-6 h-6 md:w-4 md:h-4" />
      <span className="hidden md:inline">{label}</span>
    </button>,
    document.body
  );
}
