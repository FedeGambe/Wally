import React from 'react';
import RigheTelefono from '../RigheTelefono';

// Estratto da CruscottoGenerale.tsx: tabella "Distribuzione Asset Class per Anno".
interface CruscottoAssetClassTableProps {
  cruscottoRows: any[];
  formatEuro: (val: any) => string;
  maxHeight?: number;
}

// Valore assente nel foglio (formatEuro lo mostrerebbe come "***").
const mancante = (v: any) => v === undefined || v === null || v === '' || isNaN(Number(v));
export default function CruscottoAssetClassTable({ cruscottoRows, formatEuro, maxHeight }: CruscottoAssetClassTableProps) {
  // Importo dell'anno col segno: "+" solo se il dato c'è ed è positivo, niente "+***".
  const conSegno = (v: any) => mancante(v) ? formatEuro(v) : `${Number(v) > 0 ? '+' : ''}${formatEuro(v)}`;

  return (
    <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-hairline shadow-sm transition-all duration-300 hover:shadow-md flex flex-col">
      <h2 className="font-bold text-ink font-display text-base mb-4 shrink-0">Distribuzione Asset Class per Anno</h2>
      {/* Telefono: un anno per riga, valutazione accanto all'anno, asset class in griglia */}
      <RigheTelefono
        righe={cruscottoRows.map((row: any) => {
          const parti = [row.azioniInvestitoCum, row.obbligazioniInvestitoCum, row.monetariInvestitoCum, row.rendimentoCumulativoEuro];
          const valutazione = parti.some(mancante) ? undefined : parti.reduce((s: number, v: any) => s + Number(v), 0);
          return {
            chiave: row.anno,
            titolo: row.anno,
            destra: formatEuro(valutazione),
            cifre: [
              { etichetta: 'Azioni', valore: formatEuro(row.azioniInvestitoCum) },
              { etichetta: 'Obbligazioni', valore: formatEuro(row.obbligazioniInvestitoCum) },
              { etichetta: 'Monetari', valore: formatEuro(row.monetariInvestitoCum) },
              { etichetta: 'Azioni anno', valore: conSegno(row.azioniInvestitoAnno) },
              { etichetta: 'Obblig. anno', valore: conSegno(row.obbligazioniInvestitoAnno) },
              { etichetta: 'Monet. anno', valore: conSegno(row.monetariInvestitoAnno) }
            ]
          };
        })}
      />
      <div
        className="hidden md:block overflow-x-auto lg:overflow-y-auto"
        style={maxHeight ? { maxHeight } : undefined}
      >
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="border-b border-hairline dark:border-slate-800/60 text-2xs font-bold text-ink-soft dark:text-slate-500 uppercase tracking-wider">
              <th scope="col" className="py-3 px-4">Anno</th>
              <th scope="col" className="py-3 px-4 text-right">Azioni Cum.</th>
              <th scope="col" className="py-3 px-4 text-right">Azioni Ann.</th>
              <th scope="col" className="py-3 px-4 text-right">Obblig. Cum.</th>
              <th scope="col" className="py-3 px-4 text-right">Obblig. Ann.</th>
              <th scope="col" className="py-3 px-4 text-right">Monet. Cum.</th>
              <th scope="col" className="py-3 px-4 text-right">Monet. Ann.</th>
              <th scope="col" className="py-3 px-4 text-right">Valutazione</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50 text-xs">
            {cruscottoRows.map((row: any) => {
              // Stessa formula del box "Portafoglio Attuale": capitale cumulato investito
              // nelle 3 asset class + plusvalenza cumulata a fine anno. Le commissioni NON
              // si sommano qui: il rendimento (foglio Rendimenti) è già calcolato al netto
              // di quelle, sommarle di nuovo sarebbe doppio conteggio.
              // Se manca una delle quattro parti la somma sarebbe sbagliata (prima
              // contava 0): la valutazione resta vuota invece di sottostimare.
              const parti = [row.azioniInvestitoCum, row.obbligazioniInvestitoCum, row.monetariInvestitoCum, row.rendimentoCumulativoEuro];
              const valuationSum = parti.some(mancante) ? undefined : parti.reduce((s: number, v: any) => s + Number(v), 0);
              return (
                <tr key={row.anno} className="hover:bg-canvas/60 dark:hover:bg-slate-800/20 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-ink dark:text-slate-100">
                    {row.anno}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono">{formatEuro(row.azioniInvestitoCum)}</td>
                  <td className={`py-3.5 px-4 text-right font-bold font-mono ${Number(row.azioniInvestitoAnno) < 0 ? 'text-down' : 'text-up'}`}>
                    {conSegno(row.azioniInvestitoAnno)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono">{formatEuro(row.obbligazioniInvestitoCum)}</td>
                  <td className={`py-3.5 px-4 text-right font-bold font-mono ${Number(row.obbligazioniInvestitoAnno) < 0 ? 'text-down' : 'text-up'}`}>
                    {conSegno(row.obbligazioniInvestitoAnno)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono">{formatEuro(row.monetariInvestitoCum)}</td>
                  <td className={`py-3.5 px-4 text-right font-bold font-mono ${Number(row.monetariInvestitoAnno) < 0 ? 'text-down' : 'text-up'}`}>
                    {conSegno(row.monetariInvestitoAnno)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-sky-600 font-mono">
                    {formatEuro(valuationSum)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
