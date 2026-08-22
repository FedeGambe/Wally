import React from 'react';

interface AmountHeroProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  quickAmounts?: number[];
  readOnly?: boolean;
  readOnlyNote?: string;
}

const sizeForLength = (len: number) => {
  if (len >= 9) return 'text-3xl sm:text-4xl';
  if (len >= 6) return 'text-4xl sm:text-5xl';
  return 'text-5xl sm:text-6xl';
};

/**
 * Campo Importo/Costo "in primo piano" mostrato in cima ai form di
 * inserimento (Uscita/Entrata/Trasferimento/Consumo): stessa logica di un
 * <input type="number"> normale (nessun parsing nuovo, nessuna divergenza da
 * parseLocalizedNumber), solo con una resa visiva molto più grande. Quando
 * readOnly (conto/e Contanti), i chip rapidi si nascondono e resta la nota
 * che spiega da dove arriva il valore, come nel campo Importo originale.
 */
export default function AmountHero({ id, label, value, onChange, quickAmounts = [5, 10, 20, 50], readOnly = false, readOnlyNote }: AmountHeroProps) {
  const sizeClass = sizeForLength(value.replace(/\D/g, '').length);

  const add = (n: number) => {
    const next = Math.round(((Number(value) || 0) + n) * 100) / 100;
    onChange(String(next));
  };

  return (
    <div className="rounded-3xl bg-canvas dark:bg-white/5 border border-hairline dark:border-white/10 p-4 flex flex-col items-center gap-3">
      <label htmlFor={id} className="text-2xs font-bold text-ink-soft uppercase tracking-wider">{label}</label>

      <div className="flex items-baseline justify-center gap-1">
        <span className={`font-display font-bold text-ink-soft/40 dark:text-slate-500 leading-none ${sizeClass}`}>€</span>
        <input
          id={id}
          type="number"
          step="0.01"
          min="0"
          inputMode="decimal"
          value={value}
          readOnly={readOnly}
          onChange={e => onChange(e.target.value)}
          placeholder="0"
          title={readOnly ? readOnlyNote : undefined}
          className={`font-display font-bold leading-none tabular-nums text-center bg-transparent outline-hidden max-w-[220px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0 ${sizeClass} ${
            readOnly ? 'text-ink-soft dark:text-slate-400 cursor-not-allowed' : 'text-ink dark:text-slate-100'
          }`}
        />
      </div>

      {!readOnly && (
        <div className="flex flex-wrap justify-center gap-1.5">
          {quickAmounts.map(n => (
            <button
              key={n}
              type="button"
              onClick={() => add(n)}
              className="h-8 px-3 rounded-xl bg-white dark:bg-white/10 border border-hairline dark:border-white/10 text-sm font-bold text-ink dark:text-slate-200 hover:bg-canvas dark:hover:bg-white/15 transition-colors cursor-pointer"
            >
              +{n}
            </button>
          ))}
          <button
            type="button"
            onClick={() => onChange('')}
            className="h-8 px-2.5 rounded-xl text-xs font-semibold text-ink-soft hover:text-ink dark:hover:text-slate-200 underline underline-offset-2 cursor-pointer"
          >
            Azzera
          </button>
        </div>
      )}

      {readOnly && readOnlyNote && (
        <p className="text-2xs text-ink-soft text-center">{readOnlyNote}</p>
      )}
    </div>
  );
}
