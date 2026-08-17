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
export type DropdownAccent = 'blue' | 'indigo' | 'orange' | 'emerald' | 'rose';

const ACCENT_STYLES: Record<DropdownAccent, { value: string; selected: string }> = {
  blue: {
    value: 'text-blue-600 dark:text-blue-400',
    selected: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400'
  },
  indigo: {
    value: 'text-accent',
    selected: 'bg-accent/15 text-accent'
  },
  orange: {
    value: 'text-orange-600 dark:text-orange-400',
    selected: 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400'
  },
  emerald: {
    value: 'text-up',
    selected: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
  },
  rose: {
    value: 'text-down',
    selected: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400'
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
  /** Bottone a piena larghezza invece che sagomato sul contenuto — per usarlo
   * come campo di un form (label sopra, come gli altri input) invece che come
   * pillola compatta di filtro (es. Header, barre filtri tabelle). */
  fullWidth?: boolean;
  /** Nasconde il prefisso "Label: " nel bottone, mostra solo il valore — per
   * quando la label è già resa a parte sopra il campo (form), evitando la
   * ripetizione "Categoria: Categoria: Cibo". */
  hideLabel?: boolean;
  placeholder?: string;
  /** Nome accessibile esplicito per il bottone trigger — da passare quando `hideLabel`
   * è true e la label visiva del campo è resa come <label> separato non collegato via
   * htmlFor (il DropdownMenu è un <button>, non un <input>, quindi <label> da solo non basta). */
  ariaLabel?: string;
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
  layout = 'list',
  fullWidth = false,
  hideLabel = false,
  placeholder = 'Scegli...',
  ariaLabel
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

  // Chiude il menu con Esc e riporta il focus sul bottone che lo ha aperto,
  // altrimenti un utente da tastiera perde il focus nel vuoto (il pannello è
  // in portal, fuori dall'albero DOM del bottone).
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  return (
    <div className={`relative select-none ${fullWidth ? 'w-full' : 'shrink-0'}`}>
      <button
        type="button"
        ref={triggerRef}
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel ?? (hideLabel ? `${label}: ${displayValue || placeholder}` : undefined)}
        className={`flex items-center gap-1 sm:gap-1.5 bg-canvas dark:bg-slate-800/60 border border-hairline dark:border-slate-700/60 hover:border-hairline dark:hover:border-slate-600 hover:bg-canvas dark:hover:bg-slate-800 rounded-xl text-xs font-bold text-ink-soft dark:text-slate-300 transition-all cursor-pointer ${
          fullWidth ? 'w-full justify-between px-3 py-2.5' : 'px-2 py-1'
        }`}
      >
        <Icon className="w-3.5 h-3.5 text-ink-soft shrink-0" />
        <span className={`truncate ${fullWidth ? 'flex-1 text-left' : 'max-w-[10rem]'}`}>
          {hideLabel ? (
            <strong className={accentCls.value}>{displayValue || placeholder}</strong>
          ) : (
            <>{label}: <strong className={accentCls.value}>{displayValue}</strong></>
          )}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-ink-soft shrink-0" />
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
          className={`dropdown-menu-panel fixed ${widthClass} border rounded-2xl shadow-xl z-[80] p-1.5 ${layout === 'grid-2' ? 'grid grid-cols-2 gap-1' : 'flex flex-col gap-0.5'
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
                className={`appearance-none border-0 px-3 py-2 text-left text-xs rounded-lg transition-all ${isDisabled
                  ? 'text-ink-soft dark:text-slate-600 opacity-40 pointer-events-none cursor-not-allowed'
                  : isSelected
                    ? `font-bold cursor-pointer ${accentCls.selected}`
                    : 'font-medium text-ink-soft dark:text-slate-300 hover:bg-canvas dark:hover:bg-white/10 cursor-pointer'
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
