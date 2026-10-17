import React from 'react';
import { formatEuro, formatPercent } from '../utils/format';

export interface VoceBarra {
  nome: string;
  valore: number;
  colore: string;
}

interface BarreCategorieProps {
  voci: VoceBarra[];
  /** Voce selezionata (es. filtro attivo in Uscite); le altre restano a piena opacità. */
  selezionata?: string;
  /** Se presente, ogni riga è un pulsante che seleziona/deseleziona la voce. */
  onSelect?: (nome: string) => void;
  /** Classi della riga selezionata, nel colore della sezione. */
  classeSelezionata?: string;
  className?: string;
}

/**
 * Versione da telefono delle ciambelle: una riga per voce con nome, importo,
 * quota sul totale e una barra lunga quanto la quota. Su uno schermo stretto la
 * ciambella era piccola e la sua legenda troncava i nomi; qui si legge tutto e
 * le voci si confrontano a colpo d'occhio. Stessi colori della ciambella.
 * Niente "bg-white" nelle classi dei pulsanti: in tema scuro .glass-theme li
 * riempie di grigio (regola per i tab attivi in index.css).
 */
export default function BarreCategorie({ voci, selezionata, onSelect, classeSelezionata = 'bg-canvas dark:bg-[rgb(255_255_255/0.1)]', className = '' }: BarreCategorieProps) {
  const totale = voci.reduce((s, v) => s + Math.max(0, v.valore), 0);
  if (voci.length === 0 || totale <= 0) return null;

  return (
    <ul className={`space-y-1 ${className}`}>
      {voci.map(v => {
        const quota = (Math.max(0, v.valore) / totale) * 100;
        const attiva = selezionata === v.nome;
        const contenuto = (
          <>
            <span className="flex items-baseline justify-between gap-3">
              <span className={`min-w-0 truncate text-sm ${attiva ? 'font-bold text-ink dark:text-slate-100' : 'font-semibold text-ink dark:text-slate-200'}`}>{v.nome}</span>
              <span className="shrink-0 text-sm font-bold text-ink dark:text-slate-100 tabular-nums">
                {formatEuro(v.valore)}
                <span className="ml-1.5 text-2xs font-semibold text-ink-soft dark:text-slate-400">{formatPercent(quota)}</span>
              </span>
            </span>
            <span className="block mt-1.5 h-1.5 rounded-full bg-hairline dark:bg-white/10 overflow-hidden" aria-hidden="true">
              <span className="block h-full rounded-full" style={{ width: `${quota}%`, backgroundColor: v.colore }} />
            </span>
          </>
        );
        return (
          <li key={v.nome}>
            {onSelect ? (
              <button
                type="button"
                onClick={() => onSelect(v.nome)}
                aria-pressed={attiva}
                className={`w-full text-left px-3 py-2.5 rounded-xl transition-colors cursor-pointer ${attiva ? classeSelezionata : 'hover:bg-canvas dark:hover:bg-[rgb(255_255_255/0.05)]'}`}
              >
                {contenuto}
              </button>
            ) : (
              <div className="px-3 py-2.5">{contenuto}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
