import React from 'react';

// Estratto da CruscottoGenerale.tsx: contenuto del widget "Filtro Mese
// Selezionato", renderizzato due volte dalla pagina (mobile subito dopo i KPI,
// desktop in fondo accanto alla tabella) con lo stesso markup.
interface CruscottoInspectorWidgetProps {
  record: any;
  formatEuro: (val: any) => string;
  formatPercent: (val: any) => string;
}

export default function CruscottoInspectorWidget({ record, formatEuro, formatPercent }: CruscottoInspectorWidgetProps) {
  if (!record) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-ink-soft">
        Nessun dato disponibile per il periodo selezionato.
      </div>
    );
  }

  return (
    <>
      <div>
        <span className="text-3xs text-slate-450 font-bold uppercase tracking-wider block">Filtro Mese Selezionato</span>
        <h3 className="text-xl font-bold font-display text-ink capitalize mt-2 flex items-center justify-between">
          <span>{record.mese}</span>
          <span className={`text-xs font-bold px-2 py-1 rounded-lg ${record.rendimentoMensileEuro >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
            }`}>
            {formatPercent(record.rendimentoMensilePerc)}
          </span>
        </h3>
        <p className="text-xs text-ink-soft mt-1.5 font-medium">Sintesi dei movimenti del portafoglio nel mese</p>
      </div>

      <div className="my-6 space-y-3 border-t border-b border-hairline py-4 font-semibold text-xs text-ink-soft">
        <div className="flex justify-between">
          <span>Valore Portafoglio:</span>
          <span className="text-ink font-bold font-mono">{formatEuro(record.valoreAttualePortafoglio)}</span>
        </div>
        <div className="flex justify-between">
          <span>Importo Investito Mese:</span>
          <span className="text-slate-850 font-bold font-mono">{formatEuro(record.importoMensileInvestito)}</span>
        </div>
        <div className="flex justify-between">
          <span>Risultato Netto (€):</span>
          <span className={`font-bold font-mono ${record.rendimentoMensileEuro >= 0 ? 'text-up' : 'text-rose-500'}`}>
            {formatEuro(record.rendimentoMensileEuro)}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Plusvalenza Cumulata:</span>
          <span className="text-sky-600 font-bold font-mono">{formatEuro(record.rendimentoCumulativoEuro)}</span>
        </div>
      </div>

      <div className="text-3xs text-ink-soft font-medium">
        * Mostra il mese selezionato globalmente o quello precedente se è selezionato il mese corrente.
      </div>
    </>
  );
}
