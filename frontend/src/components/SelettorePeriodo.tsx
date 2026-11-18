import React from 'react';
import { CalendarRange } from 'lucide-react';
import DropdownMenu, { DropdownAccent } from './DropdownMenu';
import type { usePeriodoAnalisi } from '../hooks/usePeriodoAnalisi';

/**
 * Menu "Periodo" delle schede Analisi periodo (Uscite, Entrate): Ultimi 12
 * mesi, i singoli anni, Tutto, Da… a… (con i due mesi accanto).
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
  return (
    <>
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
