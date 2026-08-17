import React from 'react';
import DataTable from '../DataTable';
import { formatEuro } from '../../utils/format';

interface EntrateMovimentiTableProps {
  selectedRecord: any;
  activeMonthEntries: any[];
}

/** Tabella "Movimenti Entrate" del mese selezionato: elenco dei singoli flussi registrati. */
export default function EntrateMovimentiTable({ selectedRecord, activeMonthEntries }: EntrateMovimentiTableProps) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-hairline shadow-sm text-left transition-all duration-300 hover:shadow-md">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h3 className="font-bold text-ink font-display text-base">
            Movimenti Entrate - {selectedRecord?.meseDisplay} {selectedRecord?.anno}
          </h3>
          <p className="text-xs text-ink-soft mt-1">
            Lista dei singoli flussi reali registrati per questo mese nel foglio Entrate.
          </p>
        </div>
        <div className="bg-canvas px-3 py-1 text-xs font-mono font-bold text-ink-soft rounded-lg">
          {activeMonthEntries.length} {activeMonthEntries.length === 1 ? 'movimento' : 'movimenti'}
        </div>
      </div>

      {activeMonthEntries.length === 0 ? (
        <div className="py-12 text-center text-ink-soft text-xs border border-dashed border-hairline rounded-2xl bg-canvas/50">
          Nessun movimento di entrata inserito direttamente per questo mese.
        </div>
      ) : (
        <DataTable
          data={activeMonthEntries}
          keyExtractor={(e, idx) => e.id || idx}
          columns={[
            {
              header: 'Categoria / Causale',
              render: (e) => (
                <div className="flex items-center gap-2 font-semibold text-ink">
                  <span className="shrink-0">{e.categoria === 'Stipendio' ? '💼' : '💵'}</span>
                  <span>{e.categoria || 'Generica'}</span>
                </div>
              )
            },
            {
              header: 'Canale / Conto',
              hideOnMobile: true,
              render: (e) => (
                <span className="inline-flex items-center gap-1 bg-canvas px-2 py-0.5 rounded text-3xs text-ink-soft font-mono">
                  {e.conto || 'Altro'}
                </span>
              )
            },
            {
              header: 'Importo',
              align: 'right',
              render: (e) => <span className="font-extrabold text-up font-mono">{formatEuro(e.importo)}</span>
            }
          ]}
        />
      )}
    </div>
  );
}
