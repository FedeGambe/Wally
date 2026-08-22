import React from 'react';
import { PORTAFOGLIO_DENOMINAZIONI, type PortafoglioDenominazione } from '../lib/sheetsService';

export type ContantiCounts = Record<PortafoglioDenominazione, number>;
export const EMPTY_CONTANTI_COUNTS: ContantiCounts = { 5: 0, 10: 0, 20: 0, 50: 0, 100: 0 };

/** Somma in euro delle banconote indicate — usata dai form per far corrispondere
 * automaticamente il campo Importo alla composizione di banconote scelta. */
export const contantiTotal = (counts: ContantiCounts): number =>
  PORTAFOGLIO_DENOMINAZIONI.reduce((sum, d) => sum + d * (counts[d] || 0), 0);

interface ContantiBreakdownProps {
  value: ContantiCounts;
  onChange: (value: ContantiCounts) => void;
  hint: string;
}

/**
 * Selettore "quante banconote per taglio" mostrato nei form Aggiungi
 * Uscita/Entrata/Trasferimento quando il conto coinvolto è Contanti — le
 * quantità vengono poi sommate/sottratte al tab "Portafoglio Raw" del foglio
 * Google (vedi updatePortafoglioRawCounts in sheetsService.tsx). Il segno
 * (banconote in entrata o uscita dal portafoglio) lo decide chi usa questo
 * componente: qui si raccolgono solo quantità positive.
 */
export default function ContantiBreakdown({ value, onChange, hint }: ContantiBreakdownProps) {
  const totale = contantiTotal(value);

  const setCount = (denom: PortafoglioDenominazione, count: number) => {
    onChange({ ...value, [denom]: Math.max(0, Math.floor(count) || 0) });
  };

  return (
    <div className="rounded-xl bg-canvas dark:bg-white/5 p-3">
      <p className="text-2xs font-bold text-ink-soft uppercase tracking-wider mb-2">{hint}</p>
      <div className="grid grid-cols-5 gap-2">
        {PORTAFOGLIO_DENOMINAZIONI.map(denom => (
          <div key={denom}>
            <label className="block text-3xs text-ink-soft font-semibold text-center mb-1">{denom}€</label>
            <input
              type="number"
              min={0}
              step={1}
              value={value[denom] || ''}
              onChange={e => setCount(denom, Number(e.target.value))}
              placeholder="0"
              aria-label={`Numero banconote da ${denom} euro`}
              className="w-full px-1.5 py-1.5 rounded-lg text-sm text-center bg-white dark:bg-white/5 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>
        ))}
      </div>
      {totale > 0 && (
        <p className="text-2xs text-ink-soft font-semibold mt-2 text-right">
          Totale banconote: {totale.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
        </p>
      )}
    </div>
  );
}
