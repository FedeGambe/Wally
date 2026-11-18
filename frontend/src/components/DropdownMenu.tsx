import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import { useIsMobile } from '../hooks/useIsMobile';

/**
 * Menu a tendina generico riutilizzabile (usato ad es. in Header.tsx per i
 * selettori "Esercizio"/anno e "Mese"). Mostra un bottone con l'opzione
 * attualmente selezionata; al click apre un pannello con l'elenco delle
 * opzioni disponibili (`options`), permette di sceglierne una (`onSelect`)
 * ed eventualmente disabilita alcune voci (`disabledOptions`).
 * Il pannello viene disegnato fuori dal normale albero DOM tramite un
 * "portal" (vedi commento più sotto) per evitare problemi di stile/hover
 * con il contenitore in cui il bottone si trova.
 *
 * Su telefono (sotto 768px) il pannello diventa un foglio che sale dal basso,
 * con voci alte e il nome del campo in cima: dentro i popup di inserimento il
 * menu a tendina restava piccolo, a volte fuori schermo o coperto dalla tastiera.
 * Su computer il pannello segue il bottone anche se il popup scorre, si apre
 * verso l'alto quando sotto non c'è spazio e non esce mai dallo schermo.
 */
export type DropdownAccent = 'blue' | 'teal' | 'sky' | 'orange' | 'emerald' | 'rose';

const ACCENT_STYLES: Record<DropdownAccent, { value: string; selected: string }> = {
  blue: {
    value: 'text-blue-600 dark:text-blue-400',
    selected: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400'
  },
  teal: {
    value: 'text-accent',
    selected: 'bg-accent/15 text-accent'
  },
  sky: {
    value: 'text-sky-600 dark:text-sky-400',
    selected: 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400'
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
  /** Come `hideLabel` ma solo su telefono (sotto md): su desktop resta "Label: valore".
   * Per l'Header, dove su mobile "Anno: 2026" / "Mese: Ottobre" si capiscono dal valore. */
  hideLabelOnMobile?: boolean;
  placeholder?: string;
  /** Nome accessibile esplicito per il bottone trigger — da passare quando `hideLabel`
   * è true e la label visiva del campo è resa come <label> separato non collegato via
   * htmlFor (il DropdownMenu è un <button>, non un <input>, quindi <label> da solo non basta). */
  ariaLabel?: string;
  /** Toglie il bordo dal bottone e dal pannello, lasciando solo lo sfondo/ombra
   * a delimitarli. Default false: non tocca l'aspetto degli usi esistenti
   * (Header, barre filtri). */
  borderless?: boolean;
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
  hideLabelOnMobile = false,
  placeholder = 'Scegli...',
  ariaLabel,
  borderless = false
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  // Coordinate (in pixel, relative alla viewport) a cui posizionare il pannello
  // quando è aperto. `null` finché non è ancora stato calcolato (prima apertura).
  const [position, setPosition] = useState<{ top?: number; bottom?: number; left?: number; right?: number; width?: number; maxHeight: number } | null>(null);
  const isPhone = useIsMobile(768);
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
  // Ricalcolata anche quando la pagina o il popup scorrono e quando cambia la
  // finestra, così il pannello resta attaccato al bottone. Si apre verso l'alto
  // se sotto non ci stanno almeno ~5 voci e sopra c'è più spazio; l'altezza
  // massima è lo spazio disponibile, quindi non esce mai dallo schermo.
  useLayoutEffect(() => {
    if (!open || isPhone || !triggerRef.current) return;
    const calcola = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      // A piena larghezza il pannello combacia col bottone (altrimenti resta a
      // `widthClass`, troppo stretto per opzioni lunghe come i preset).
      const width = fullWidth ? rect.width : undefined;
      const margine = 12;
      const sotto = window.innerHeight - rect.bottom - margine;
      const sopra = rect.top - margine;
      const versoAlto = sotto < 220 && sopra > sotto;
      const maxHeight = Math.max(140, Math.min(320, (versoAlto ? sopra : sotto) - 6));
      const verticale = versoAlto ? { bottom: window.innerHeight - rect.top + 6 } : { top: rect.bottom + 6 };
      const orizzontale = align === 'right'
        ? { right: Math.max(8, window.innerWidth - rect.right) }
        : { left: Math.max(8, Math.min(rect.left, window.innerWidth - (width ?? 180) - 8)) };
      setPosition({ ...verticale, ...orizzontale, width, maxHeight });
    };
    calcola();
    window.addEventListener('scroll', calcola, true);
    window.addEventListener('resize', calcola);
    return () => {
      window.removeEventListener('scroll', calcola, true);
      window.removeEventListener('resize', calcola);
    };
  }, [open, align, fullWidth, isPhone]);

  // All'apertura la voce scelta è già in vista (liste lunghe come conti e categorie).
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => {
      panelRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
    });
    return () => cancelAnimationFrame(id);
  }, [open, position === null]);

  // Chiude il menu quando si clicca fuori (né sul bottone né sul pannello).
  // L'ascoltatore viene aggiunto solo mentre il menu è aperto e rimosso alla
  // chiusura/unmount (funzione di cleanup restituita da useEffect) per non
  // lasciare listener "fantasma" attaccati al documento.
  useEffect(() => {
    // Su telefono chiude il velo scuro dietro al foglio (con onClick, così il
    // tocco non arriva a quello che c'è sotto).
    if (!open || isPhone) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [open, isPhone]);

  // Chiude il menu con Esc e riporta il focus sul bottone che lo ha aperto,
  // altrimenti un utente da tastiera perde il focus nel vuoto (il pannello è
  // in portal, fuori dall'albero DOM del bottone).
  useEffect(() => {
    if (!open) return;
    // In cattura su window: scatta prima dell'Esc del popup (useFocusTrap, su
    // document) e lo ferma, così Esc chiude solo il menu e non anche il popup.
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      setOpen(false);
      triggerRef.current?.focus();
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [open]);

  // Una voce del menu; `grande` su telefono (più alta, testo più grande, spunta).
  const voce = (opt: string, grande: boolean) => {
    const isDisabled = disabledOptions.includes(opt);
    const isSelected = value === opt;
    return (
      <button
        key={opt}
        type="button"
        role="option"
        aria-selected={isSelected}
        disabled={isDisabled}
        onClick={() => {
          if (isDisabled) return;
          onSelect(opt);
          setOpen(false);
        }}
        className={`appearance-none border-0 text-left rounded-lg transition-all flex items-center justify-between gap-2 ${grande ? 'px-4 py-3.5 text-sm rounded-xl' : 'px-3 py-2 text-xs'} ${isDisabled
          ? 'text-ink-soft dark:text-slate-600 opacity-40 pointer-events-none cursor-not-allowed'
          : isSelected
            ? `font-bold cursor-pointer ${accentCls.selected}`
            : 'font-medium text-ink-soft dark:text-slate-200 hover:bg-canvas dark:hover:bg-white/10 cursor-pointer'
          }`}
      >
        <span className="min-w-0">{getOptionLabel(opt)}</span>
        {grande && isSelected && <Check className="w-4 h-4 shrink-0" />}
      </button>
    );
  };

  return (
    <div className={`relative select-none ${fullWidth ? 'w-full' : 'shrink-0'}`}>
      <button
        type="button"
        ref={triggerRef}
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel ?? (hideLabel || hideLabelOnMobile ? `${label}: ${displayValue || placeholder}` : undefined)}
        className={`flex items-center gap-1 sm:gap-1.5 bg-canvas dark:bg-slate-800/60 hover:bg-canvas dark:hover:bg-slate-800 rounded-xl text-xs font-bold text-ink-soft dark:text-slate-300 transition-all cursor-pointer ${
          borderless ? '' : 'border border-hairline dark:border-slate-700/60 hover:border-hairline dark:hover:border-slate-600'
        } ${fullWidth ? 'w-full justify-between px-3 py-2.5' : 'px-2 py-1'}`}
      >
        <Icon className="w-3.5 h-3.5 text-ink-soft shrink-0" />
        <span className={`truncate ${fullWidth ? 'flex-1 text-left' : 'max-w-[10rem]'}`}>
          {hideLabel ? (
            <strong className={accentCls.value}>{displayValue || placeholder}</strong>
          ) : (
            <><span className={hideLabelOnMobile ? 'hidden md:inline' : ''}>{label}: </span><strong className={accentCls.value}>{displayValue}</strong></>
          )}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-ink-soft shrink-0" />
      </button>

      {/* createPortal disegna questo <div> come figlio diretto di document.body invece
          che dentro l'albero JSX qui sopra: appare comunque nello stesso punto (perche'
          e' posizionato con `fixed` + `position`), ma non eredita overflow/z-index/hover
          del contenitore che ospita il bottone. Si apre solo se `open` e' true e la
          posizione e' gia' stata calcolata (`position` non nullo). */}
      {open && (isPhone || position) && createPortal(
        isPhone ? (
          // Telefono: foglio dal basso sopra a tutto (anche ai popup), voci alte.
          <div className="fixed inset-0 z-[90] flex flex-col justify-end">
            <div className="absolute inset-0 bg-slate-950/50 animate-fadeIn" aria-hidden="true" onClick={() => setOpen(false)} />
            <div
              ref={panelRef}
              role="listbox"
              aria-label={label}
              className="dropdown-menu-panel dropdown-menu-foglio relative rounded-t-3xl shadow-2xl max-h-[70vh] flex flex-col animate-fadeIn pb-[env(safe-area-inset-bottom)]"
            >
              <div className="flex items-center justify-between px-5 pt-3 pb-2 shrink-0">
                <span className="text-2xs font-bold uppercase tracking-wider text-ink-soft">{label}</span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-xs font-bold text-ink-soft px-2 py-1 cursor-pointer"
                >
                  Chiudi
                </button>
              </div>
              <div className={`overflow-y-auto overscroll-contain px-3 pb-4 ${layout === 'grid-2' ? 'grid grid-cols-2 gap-1.5' : 'flex flex-col gap-1'}`}>
                {options.map(opt => voce(opt, true))}
              </div>
            </div>
          </div>
        ) : (
          <div
            ref={panelRef}
            role="listbox"
            aria-label={label}
            style={{ top: position!.top, bottom: position!.bottom, left: position!.left, right: position!.right, width: position!.width, maxHeight: position!.maxHeight }}
            className={`dropdown-menu-panel fixed ${widthClass} ${borderless ? '' : 'border'} rounded-2xl shadow-xl z-[80] p-1.5 ${layout === 'grid-2' ? 'grid grid-cols-2 gap-1' : 'flex flex-col gap-0.5'
              } overflow-y-auto overscroll-contain animate-fadeIn`}
          >
            {options.map(opt => voce(opt, false))}
          </div>
        ),
        document.body
      )}
    </div>
  );
}
