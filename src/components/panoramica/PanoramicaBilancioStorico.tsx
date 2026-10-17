import React from 'react';
import { ChevronRight } from 'lucide-react';
import DataTable from '../DataTable';
import { formatEuro, formatPercent } from '../../utils/format';
import { kpiColorTesto, thresholdRange } from '../../utils/kpiColorScale';
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
  /** Dentro il popup "Storico mesi" (telefono): elenco di mesi invece della
   * tabella, senza cornice da card né titolo, che dà già il popup. */
  inPopup?: boolean;
}

/**
 * Tabella "Bilancio Storico Mensile": una riga per mese, con Spese/Investito/
 * Risparmio Netto colorati in base a quanto la quota sulle entrate si
 * avvicina o supera la soglia target dinamica (vedi src/utils/kpiColorScale.ts).
 */
// Classe del badge "Quota Invest.+Risp. %": stesse fasce in tabella e nell'elenco.
function quotaBadgeClass(quota: number): string {
  return quota >= 35
    ? "bg-emerald-100 text-emerald-800"
    : quota >= 10
      ? "bg-amber-100 text-amber-800"
      : "bg-rose-100 text-rose-800";
}

/**
 * Versione a elenco per il popup "Storico mesi" su telefono: la tabella a 8
 * colonne andava scorsa di lato e si perdeva quale riga fosse quale. Qui ogni
 * mese è una riga a tutta larghezza (mese + quota in alto, le cinque cifre in
 * una griglia sotto, con l'etichetta sopra ogni cifra); tocco = dettaglio mese.
 * Stessi dati e stessi colori a soglia della tabella.
 */
function ElencoMesi({ filteredRisparmio, dynamicThresholds, handleOpenMonthDetail }: Omit<PanoramicaBilancioStoricoProps, 'inPopup'>) {
  const mesi = [...filteredRisparmio].reverse();
  if (mesi.length === 0) {
    return <p className="text-sm text-ink-soft py-8 text-center">Nessun mese registrato per l'anno scelto.</p>;
  }

  const cifra = (label: string, valore: number, colore?: string, forte = false) => (
    <span className="block min-w-0">
      <span className="block text-3xs font-bold uppercase tracking-wider text-ink-soft">{label}</span>
      <span
        className={`block mt-0.5 text-xs font-mono tabular-nums ${forte ? 'font-extrabold' : 'font-semibold'} ${colore ? '' : 'text-ink'}`}
        style={colore ? { color: colore } : undefined}
      >
        {formatEuro(valore)}
      </span>
    </span>
  );

  return (
    // Righe alternate al posto dei divisori: una riga sì e una no appena più
    // chiara, quanto basta a separare i mesi senza linee.
    <ul className="-mx-2 space-y-1">
      {mesi.map((r) => {
        const perc = (v: number) => (r.entrate ? (v / r.entrate) * 100 : 0);
        const quota = perc(r.investito + r.risparmioNetto);
        return (
          <li key={`${r.mese}-${r.anno}`} className="rounded-2xl odd:bg-canvas dark:odd:bg-white/[0.03]">
            <button
              type="button"
              onClick={() => handleOpenMonthDetail(r.mese, r.anno)}
              aria-label={`Dettaglio di ${r.mese} ${r.anno}`}
              className="w-full px-3 py-3.5 text-left cursor-pointer rounded-2xl transition-colors hover:bg-hairline/50 dark:hover:bg-white/[0.06] focus-visible:outline-2 focus-visible:outline-blue-500"
            >
              <span className="flex items-center justify-between gap-3">
                <span className="text-sm font-bold text-ink capitalize">{r.mese} {r.anno}</span>
                <span className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-3xs font-bold tracking-wider ${quotaBadgeClass(quota)}`}>
                    {formatPercent(quota)} risp.+inv.
                  </span>
                  <ChevronRight className="w-4 h-4 text-ink-soft shrink-0" />
                </span>
              </span>
              <span className="grid grid-cols-3 gap-x-3 gap-y-3 mt-3">
                {cifra('Entrate', r.entrate)}
                {cifra('Primarie', r.spesePrimarie, kpiColorTesto(perc(r.spesePrimarie), thresholdRange(dynamicThresholds.primarie, 10, false)))}
                {cifra('Secondarie', r.speseSecondarie, kpiColorTesto(perc(r.speseSecondarie), thresholdRange(dynamicThresholds.secondarie, 10, false)))}
                {cifra('Investito', r.investito, kpiColorTesto(perc(r.investito), thresholdRange(dynamicThresholds.investiti, 10)))}
                {cifra('Risparmio', r.risparmioNetto, kpiColorTesto(perc(r.risparmioNetto), thresholdRange(dynamicThresholds.risparmio, 10)), true)}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export default function PanoramicaBilancioStorico({ filteredRisparmio, dynamicThresholds, handleOpenMonthDetail, inPopup = false }: PanoramicaBilancioStoricoProps) {
  if (inPopup) {
    return (
      <ElencoMesi
        filteredRisparmio={filteredRisparmio}
        dynamicThresholds={dynamicThresholds}
        handleOpenMonthDetail={handleOpenMonthDetail}
      />
    );
  }

  return (
    <div className="bg-white p-6 rounded-3xl border border-hairline shadow-sm text-left transition-all duration-300 hover:shadow-md">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-ink font-display text-base">Bilancio Storico Mensile</h3>
          <p className="text-xs text-ink-soft mt-1">Sintesi consolidata ricavata dal foglio Risparmio</p>
        </div>
        <span className="text-3xs text-ink-soft font-bold bg-canvas px-2.5 py-1 rounded-full uppercase tracking-wider">
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
              <span className="font-medium font-mono" style={{ color: kpiColorTesto(r.entrate ? (r.spesePrimarie / r.entrate) * 100 : 0, thresholdRange(dynamicThresholds.primarie, 10, false)) }}>
                {formatEuro(r.spesePrimarie)}
              </span>
            )
          },
          {
            header: 'Spese Secondarie',
            align: 'right',
            render: (r) => (
              <span className="font-medium font-mono" style={{ color: kpiColorTesto(r.entrate ? (r.speseSecondarie / r.entrate) * 100 : 0, thresholdRange(dynamicThresholds.secondarie, 10, false)) }}>
                {formatEuro(r.speseSecondarie)}
              </span>
            )
          },
          {
            header: 'Investito',
            align: 'right',
            render: (r) => (
              <span className="font-semibold font-mono" style={{ color: kpiColorTesto(r.entrate ? (r.investito / r.entrate) * 100 : 0, thresholdRange(dynamicThresholds.investiti, 10)) }}>
                {formatEuro(r.investito)}
              </span>
            )
          },
          {
            header: 'Risparmio Netto',
            align: 'right',
            render: (r) => (
              <span className="font-extrabold font-mono" style={{ color: kpiColorTesto(r.entrate ? (r.risparmioNetto / r.entrate) * 100 : 0, thresholdRange(dynamicThresholds.risparmio, 10)) }}>
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
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-3xs font-bold uppercase tracking-wider ${quotaBadgeClass(quota)}`}>
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
