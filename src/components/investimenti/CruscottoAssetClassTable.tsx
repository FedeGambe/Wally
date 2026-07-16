import React from 'react';

// Estratto da CruscottoGenerale.tsx: tabella "Distribuzione Asset Class per Anno".
interface CruscottoAssetClassTableProps {
  cruscottoRows: any[];
  formatEuro: (val: any) => string;
  maxHeight?: number;
}

export default function CruscottoAssetClassTable({ cruscottoRows, formatEuro, maxHeight }: CruscottoAssetClassTableProps) {
  return (
    <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm transition-all duration-300 hover:shadow-md flex flex-col">
      <h3 className="font-bold text-slate-800 font-display text-base mb-4 shrink-0">Distribuzione Asset Class per Anno</h3>
      <div
        className="overflow-x-auto lg:overflow-y-auto"
        style={maxHeight ? { maxHeight } : undefined}
      >
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800/60 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-4">Anno</th>
              <th className="py-3 px-4 text-right">Azioni Cum.</th>
              <th className="py-3 px-4 text-right">Azioni Ann.</th>
              <th className="py-3 px-4 text-right">Obblig. Cum.</th>
              <th className="py-3 px-4 text-right">Obblig. Ann.</th>
              <th className="py-3 px-4 text-right">Monet. Cum.</th>
              <th className="py-3 px-4 text-right">Monet. Ann.</th>
              <th className="py-3 px-4 text-right">Valutazione</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50 text-xs">
            {cruscottoRows.map((row: any) => {
              // Stessa formula del box "Portafoglio Attuale": capitale cumulato investito
              // nelle 3 asset class + plusvalenza cumulata a fine anno. Le commissioni NON
              // si sommano qui: il rendimento (foglio Rendimenti) è già calcolato al netto
              // di quelle, sommarle di nuovo sarebbe doppio conteggio.
              const valuationSum = Number(row.azioniInvestitoCum || 0) +
                Number(row.obbligazioniInvestitoCum || 0) +
                Number(row.monetariInvestitoCum || 0) +
                Number(row.rendimentoCumulativoEuro || 0);
              return (
                <tr key={row.anno} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/20 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-100">
                    {row.anno}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono">{formatEuro(row.azioniInvestitoCum)}</td>
                  <td className="py-3.5 px-4 text-right text-emerald-600 font-bold font-mono">
                    +{formatEuro(row.azioniInvestitoAnno)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono">{formatEuro(row.obbligazioniInvestitoCum)}</td>
                  <td className="py-3.5 px-4 text-right text-emerald-600 font-bold font-mono">
                    +{formatEuro(row.obbligazioniInvestitoAnno)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono">{formatEuro(row.monetariInvestitoCum)}</td>
                  <td className="py-3.5 px-4 text-right text-emerald-600 font-bold font-mono">
                    +{formatEuro(row.monetariInvestitoAnno)}
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
