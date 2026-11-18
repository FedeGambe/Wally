import React from 'react';
import { CalendarRange, ChevronLeft, ChevronRight } from 'lucide-react';
import DropdownMenu, { DropdownAccent } from './DropdownMenu';
import type { usePeriodoAnalisi } from '../hooks/usePeriodoAnalisi';

/**
 * Menu "Periodo" delle schede Analisi periodo (Uscite, Entrate): Ultimi 12
 * mesi, i singoli anni (con le frecce per l'anno prima/dopo), Tutto, Da… a…
 * (con i due mesi accanto). Usato anche dal Resoconto dei Conti e dai Consumi.
 */
interface SelettorePeriodoProps {
  p: ReturnType<typeof usePeriodoAnalisi>;
  accent: DropdownAccent;
  /** Classe Tailwind dell'anello dei campi mese, es. "focus:ring-orange-500". */
  ring: string;
}

export default function SelettorePeriodo({ p, accent, ring }: SelettorePeriodoProps) {
  const etichetta = (id: string) => p.periodi.find(([x]) => x === id)?.[1] ?? id;
  const input = `bg-canvas border border-hairline rounded-xl px-3 py-1.5 text-xs font-bold text-ink focus:outline-hidden focus:ring-1 ${ring}`;
  // Con un anno scelto, le frecce passano all'anno prima/dopo tra quelli con dati
  // (p.anni è dal più recente al più vecchio).
  const anno = p.periodo.startsWith('anno-') ? parseInt(p.periodo.slice(5), 10) : null;
  const i = anno === null ? -1 : p.anni.indexOf(anno);
  const prima = i >= 0 && i < p.anni.length - 1 ? p.anni[i + 1] : null;
  const dopo = i > 0 ? p.anni[i - 1] : null;
  const freccia = 'p-1.5 rounded-lg border border-hairline bg-canvas text-ink-soft hover:text-ink transition-colors cursor-pointer disabled:opacity-35 disabled:cursor-default disabled:hover:text-ink-soft';
  return (
    <>
      {anno !== null && (
        <button type="button" aria-label={prima ? `Anno ${prima}` : 'Nessun anno prima'} title={prima ? String(prima) : undefined}
          disabled={prima === null} onClick={() => prima && p.setPeriodo(`anno-${prima}`)} className={freccia}>
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}
      <DropdownMenu
        icon={CalendarRange}
        accent={accent}
        widthClass="w-48"
        label="Periodo"
        value={p.periodo}
        displayValue={etichetta(p.periodo)}
        options={p.periodi.map(([id]) => id)}
        onSelect={p.setPeriodo}
        getOptionLabel={etichetta}
      />
      {anno !== null && (
        <button type="button" aria-label={dopo ? `Anno ${dopo}` : 'Nessun anno dopo'} title={dopo ? String(dopo) : undefined}
          disabled={dopo === null} onClick={() => dopo && p.setPeriodo(`anno-${dopo}`)} className={freccia}>
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
      {p.periodo === 'personalizzato' && (
        <div className="flex items-center gap-1.5 text-xs text-ink-soft font-medium">
          <input type="month" aria-label="Dal mese" value={p.da} min={p.minInput} max={p.maxInput} onChange={e => p.setDa(e.target.value)} className={input} />
          –
          <input type="month" aria-label="Al mese" value={p.a} min={p.minInput} max={p.maxInput} onChange={e => p.setA(e.target.value)} className={input} />
        </div>
      )}
    </>
  );
}
