import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';

/**
 * Menu a tendina generico riutilizzabile (usato ad es. in Header.tsx per i
 * selettori "Esercizio"/anno e "Mese"). Mostra un bottone con l'opzione
 * attualmente selezionata; al click apre un pannello con l'elenco delle
 * opzioni disponibili (`options`), permette di sceglierne una (`onSelect`)
 * ed eventualmente disabilita alcune voci (`disabledOptions`).
 * Il pannello viene disegnato fuori dal normale albero DOM tramite un
 * "portal" (vedi commento più sotto) per evitare problemi di stile/hover
 * con il contenitore in cui il bottone si trova.
 */
export type DropdownAccent = 'blue' | 'indigo' | 'orange';

const ACCENT_STYLES: Record<DropdownAccent, { value: string; selected: string }> = {
  blue: {
    value: 'text-blue-600 dark:text-blue-400',
    selected: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400'
  },
  indigo: {
    value: 'text-indigo-600 dark:text-indigo-400',
    selected: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400'
  },
  orange: {
    value: 'text-orange-600 dark:text-orange-400',
    selected: 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400'
  }
};

interface DropdownMenuProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  accent: DropdownAccent;
  value: string;
  displayValue: string;
  options: string[];
  onSelect: (value: string) => void;
  getOptionLabel?: (value: string) => string;
  disabledOptions?: string[];
  widthClass?: string;
  align?: 'left' | 'right';
  layout?: 'list' | 'grid-2';
}

export default function DropdownMenu({
  icon: Icon,
  label,
  accent,
  value,
  displayValue,
  options,
  onSelect,
  getOptionLabel = (v) => v,
  disabledOptions = [],
  widthClass = 'w-44',
  align = 'left',
  layout = 'list'
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  // Coordinate (in pixel, relative alla viewport) a cui posizionare il pannello
  // quando è aperto. `null` finché non è ancora stato calcolato (prima apertura).
  const [position, setPosition] = useState<{ top: number; left?: number; right?: number } | null>(null);
  // Riferimento al bottone che apre il menu: serve per calcolarne la posizione
  // sullo schermo (getBoundingClientRect) e per riconoscere i click "dentro" il trigger.
  const triggerRef = useRef<HTMLButtonElement>(null);
  // Riferimento al pannello del menu (che vive in un portal, vedi sotto): serve
  // per riconoscere i click fatti dentro il pannello e non chiuderlo per errore.
  const panelRef = useRef<HTMLDivElement>(null);
  const accentCls = ACCENT_STYLES[accent];

  // Il pannello viene renderizzato in portal su document.body: cosi' non e' piu' un
  // discendente DOM della card bg-white che lo contiene, ed evita che l'hover su una
  // voce faccia scattare il glow ".glass-theme .bg-white:hover" sull'intera card
  // (l'hover CSS risale a tutti gli antenati, non solo al pannello stesso).
  // Si usa useLayoutEffect (invece di useEffect) per calcolare la posizione PRIMA
  // che il browser disegni il pannello a schermo: cosi' non si vede un frame in cui
  // il pannello appare nel posto sbagliato e poi "salta" in quello giusto.
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    if (align === 'right') {
      setPosition({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
    } else {
      setPosition({ top: rect.bottom + 6, left: rect.left });
    }
  }, [open, align]);

  // Chiude il menu quando si clicca fuori (né sul bottone né sul pannello).
  // L'ascoltatore viene aggiunto solo mentre il menu è aperto e rimosso alla
  // chiusura/unmount (funzione di cleanup restituita da useEffect) per non
  // lasciare listener "fantasma" attaccati al documento.
  useEffect(() => {
    if (!open) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [open]);

  return (
    <div className="relative select-none shrink-0">
      <button
        ref={triggerRef}
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 sm:gap-1.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 hover:border-slate-200 dark:hover:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
      >
        <Icon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span className="truncate max-w-[10rem]">
          {label}: <strong className={accentCls.value}>{displayValue}</strong>
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
      </button>

      {/* createPortal disegna questo <div> come figlio diretto di document.body invece
          che dentro l'albero JSX qui sopra: appare comunque nello stesso punto (perche'
          e' posizionato con `fixed` + `position`), ma non eredita overflow/z-index/hover
          del contenitore che ospita il bottone. Si apre solo se `open` e' true e la
          posizione e' gia' stata calcolata (`position` non nullo). */}
      {open && position && createPortal(
        <div
          ref={panelRef}
          style={{ top: position.top, left: position.left, right: position.right }}
          className={`dropdown-menu-panel fixed ${widthClass} border rounded-2xl shadow-xl z-50 p-1.5 ${layout === 'grid-2' ? 'grid grid-cols-2 gap-1' : 'flex flex-col gap-0.5'
            } max-h-64 overflow-y-auto animate-fadeIn`}
        >
          {options.map(opt => {
            const isDisabled = disabledOptions.includes(opt);
            const isSelected = value === opt;
            return (
              <button
                key={opt}
                disabled={isDisabled}
                onClick={() => {
                  if (isDisabled) return;
                  onSelect(opt);
                  setOpen(false);
                }}
                className={`appearance-none border-0 px-3 py-1.5 text-left text-[11px] rounded-lg transition-all ${isDisabled
                  ? 'text-slate-400 dark:text-slate-600 opacity-40 pointer-events-none cursor-not-allowed'
                  : isSelected
                    ? `font-bold cursor-pointer ${accentCls.selected}`
                    : 'font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer'
                  }`}
              >
                {getOptionLabel(opt)}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}
