import React from 'react';
import { formatEuro } from '../utils/format';

/**
 * Cifra euro per i numeri "titolo" dei widget: parte intera a dimensione piena,
 * decimali + simbolo "€" più piccoli (dimensione relativa via em, si adatta a
 * qualunque font-size del contenitore). Libera spazio prezioso su mobile senza
 * perdere precisione.
 */
export default function EuroAmount({ value }: { value: unknown }) {
  const formatted = formatEuro(value);
  const commaIndex = formatted.indexOf(',');
  if (commaIndex === -1) return <>{formatted}</>;
  return (
    <>
      {formatted.slice(0, commaIndex)}
      <span className="text-[0.6em]">{formatted.slice(commaIndex)}</span>
    </>
  );
}
