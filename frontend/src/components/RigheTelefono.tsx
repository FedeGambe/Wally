import React from 'react';

export interface CifraRiga {
  etichetta: string;
  valore: React.ReactNode;
  /** Colore del valore (es. rendColorTesto), altrimenti inchiostro normale. */
  colore?: string;
}

export interface RigaTelefono {
  chiave: React.Key;
  titolo: React.ReactNode;
  /** Cifra principale accanto al titolo (es. il saldo del mese). */
  destra?: React.ReactNode;
  cifre: CifraRiga[];
}

/**
 * Versione da telefono delle tabelle larghe (Investimenti: Conti, Rendimenti,
 * Fondo pensione, Asset Class): una riga per mese o anno, a righe alternate,
 * con le cifre principali in una griglia a 3 colonne ed etichetta sopra ogni
 * cifra. Le tabelle a 7-14 colonne andavano scorse di lato e si perdeva quale
 * cifra fosse quale; le colonne secondarie restano nella tabella da computer.
 */
export default function RigheTelefono({ righe, className = '' }: { righe: RigaTelefono[]; className?: string }) {
  return (
    <ul className={`md:hidden -mx-2 space-y-1 ${className}`}>
      {righe.map(r => (
        <li key={r.chiave} className="px-3 py-3.5 rounded-2xl odd:bg-canvas dark:odd:bg-white/[0.03]">
          <span className="flex items-baseline justify-between gap-3">
            <span className="text-sm font-bold text-ink dark:text-slate-100 capitalize">{r.titolo}</span>
            {r.destra !== undefined && (
              <span className="text-sm font-extrabold text-ink dark:text-slate-100 tabular-nums">{r.destra}</span>
            )}
          </span>
          <span className="grid grid-cols-3 gap-x-3 gap-y-3 mt-3">
            {r.cifre.map(c => (
              <span key={c.etichetta} className="block min-w-0">
                <span className="block text-3xs font-bold uppercase tracking-wider text-ink-soft dark:text-slate-400">{c.etichetta}</span>
                <span
                  className={`block mt-0.5 text-xs font-semibold font-mono tabular-nums ${c.colore ? '' : 'text-ink dark:text-slate-100'}`}
                  style={c.colore ? { color: c.colore } : undefined}
                >
                  {c.valore}
                </span>
              </span>
            ))}
          </span>
        </li>
      ))}
    </ul>
  );
}
