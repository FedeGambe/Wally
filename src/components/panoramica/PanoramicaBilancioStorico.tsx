import React from 'react';
import { ChevronRight } from 'lucide-react';
import DataTable from '../DataTable';
import { formatEuro, formatPercent } from '../../utils/format';
import { kpiColor, thresholdRange } from '../../utils/kpiColorScale';
import type { RisparmioMese } from '../../data/mockData';

interface DynamicThresholds {
  primarie: number;
  secondarie: number;
  investiti: number;
  risparmio: number;
}

interface PanoramicaBilancioStoricoProps {
  filteredRisparmio: RisparmioMese[];
  dynamicThresholds: DynamicThresholds;
  handleOpenMonthDetail: (mese: string, anno: number) => void;
}

/**
 * Tabella "Bilancio Storico Mensile": una riga per mese, con Spese/Investito/
 * Risparmio Netto colorati in base a quanto la quota sulle entrate si
 * avvicina o supera la soglia target dinamica (vedi src/utils/kpiColorScale.ts).
 */
export default function PanoramicaBilancioStorico({ filteredRisparmio, dynamicThresholds, handleOpenMonthDetail }: PanoramicaBilancioStoricoProps) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-hairline shadow-sm text-left transition-all duration-300 hover:shadow-md">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-ink font-display text-base">Bilancio Storico Mensile</h3>
          <p className="text-xs text-ink-soft mt-1">Sintesi consolidata ricavata dal foglio Risparmio</p>
        </div>
        <span className="text-[10px] text-ink-soft font-bold bg-canvas px-2.5 py-1 rounded-full uppercase tracking-wider">
          Storico: {filteredRisparmio.length} mesi
        </span>
      </div>

      <DataTable
        data={[...filteredRisparmio].reverse()}
        keyExtractor={(r) => `${r.mese}-${r.anno}`}
        columns={[
          {
            header: 'Mese / Anno',
            className: 'w-40',
            render: (r) => (
              <span className="font-semibold text-ink capitalize whitespace-nowrap">
                <span className="hidden md:inline">{r.mese} {r.anno}</span>
                <span className="md:hidden">{r.mese?.slice(0, 3)} '{String(r.anno).slice(2)}</span>
              </span>
            )
          },
          {
            header: 'Entrate',
            align: 'right',
            render: (r) => <span className="text-ink-soft font-medium font-mono">{formatEuro(r.entrate)}</span>
          },
          {
            header: 'Spese Primarie',
            align: 'right',
            render: (r) => (
              <span className="font-medium font-mono" style={{ color: kpiColor(r.entrate ? (r.spesePrimarie / r.entrate) * 100 : 0, thresholdRange(dynamicThresholds.primarie, 10, false)) }}>
                {formatEuro(r.spesePrimarie)}
              </span>
            )
          },
          {
            header: 'Spese Secondarie',
            align: 'right',
            render: (r) => (
              <span className="font-medium font-mono" style={{ color: kpiColor(r.entrate ? (r.speseSecondarie / r.entrate) * 100 : 0, thresholdRange(dynamicThresholds.secondarie, 10, false)) }}>
                {formatEuro(r.speseSecondarie)}
              </span>
            )
          },
          {
            header: 'Investito',
            align: 'right',
            render: (r) => (
              <span className="font-semibold font-mono" style={{ color: kpiColor(r.entrate ? (r.investito / r.entrate) * 100 : 0, thresholdRange(dynamicThresholds.investiti, 10)) }}>
                {formatEuro(r.investito)}
              </span>
            )
          },
          {
            header: 'Risparmio Netto',
            align: 'right',
            render: (r) => (
              <span className="font-extrabold font-mono" style={{ color: kpiColor(r.entrate ? (r.risparmioNetto / r.entrate) * 100 : 0, thresholdRange(dynamicThresholds.risparmio, 10)) }}>
                {formatEuro(r.risparmioNetto)}
              </span>
            )
          },
          {
            header: 'Quota Invest.+Risp. %',
            align: 'right',
            render: (r) => {
              const quota = r.entrate ? ((r.investito + r.risparmioNetto) / r.entrate) * 100 : 0;
              return (
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${quota >= 35
                  ? "bg-emerald-100 text-emerald-800"
                  : quota >= 10
                    ? "bg-amber-100 text-amber-800"
                    : "bg-rose-100 text-rose-800"
                  }`}>
                  {formatPercent(quota)}
                </span>
              );
            }
          },
          {
            header: 'Dettagli',
            align: 'right',
            render: (r) => (
              <button
                onClick={() => handleOpenMonthDetail(r.mese, r.anno)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-blue-600 hover:text-white hover:bg-blue-600 rounded-xl border border-blue-200 hover:border-transparent transition-all duration-150 cursor-pointer"
              >
                Analizza
                <ChevronRight className="w-3.5 h-3.5 shrink-0" />
              </button>
            )
          }
        ]}
      />
    </div>
  );
}
