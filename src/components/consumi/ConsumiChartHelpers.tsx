import React from 'react';
import type { TimeRange } from '../../hooks/useAnalisiConsumiData';

// Estratto da AnalisiConsumi.tsx: helper di formattazione/presentazione
// condivisi dai grafici storici della pagina (toggle range, tooltip, tick).

// Asse X dei grafici settimanali: una tacca per ogni mese (la prima settimana del mese),
// etichettata "Ago 26". Le label settimana sono del tipo "11 Ago 26" (vedi getWeekLabel).
// Con tanti mesi (storico) si diradano le tacche per non farle sovrapporre.
export function monthAxisProps(data: { settimana: string }[], isMobile: boolean) {
  const maxTicks = isMobile ? 5 : 12;
  const firstOfMonth = data
    .filter((d, i) => i === 0 || d.settimana.split(' ').slice(1).join(' ') !== data[i - 1].settimana.split(' ').slice(1).join(' '))
    .map(d => d.settimana);
  const step = Math.ceil(firstOfMonth.length / maxTicks);
  return {
    dataKey: 'settimana',
    ticks: firstOfMonth.filter((_, i) => i % step === 0),
    interval: 0 as const,
    tickFormatter: (value: string) => String(value).split(' ').slice(1).join(' ')
  };
}

// Etichette asse Y e tooltip: massimo `dec` cifre decimali (default 2; 3 per il prezzo del
// carburante, 0 per i km percorsi).
export function fmtNum(val: unknown, dec = 2): string {
  return Number(val).toLocaleString('it-IT', { maximumFractionDigits: dec });
}
export const formatAxisNumber = (val: number) => fmtNum(val);
export const formatAxisKm = (val: number) => fmtNum(val, 0);
export const formatAxisPrezzo = (val: number) => `€${fmtNum(val, 3)}`;
export const formatAxisEuro = (val: number) => `€${fmtNum(val)}`;

// Toggle generico a segmenti, riusato per storico/12 mesi e per accumulato/per km
export function SegmentedToggle<T extends string>({ value, onChange, options }: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="flex bg-canvas dark:bg-slate-800/60 p-1 rounded-xl gap-0.5 border border-hairline dark:border-slate-700 select-none shrink-0">
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`text-3xs px-2.5 py-1 font-extrabold rounded-lg transition-all cursor-pointer ${
            value === opt.value ? 'bg-rose-600 text-white shadow-xs' : 'text-ink-soft hover:text-down'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function TimeRangeToggle({ value, onChange }: { value: TimeRange; onChange: (range: TimeRange) => void }) {
  return (
    <SegmentedToggle
      value={value}
      onChange={onChange}
      options={[{ value: 'storico', label: 'Storico' }, { value: '12mesi', label: 'Ultimi 12 Mesi' }]}
    />
  );
}

// Tooltip dedicato per Km/Lt: bianco per il valore calcolato, grigio per il dato di bordo auto
export function KmLtTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: 'none', borderRadius: '12px', padding: '8px 12px' }}>
      <div style={{ color: '#fff', fontWeight: 'bold', marginBottom: 4, fontSize: 12 }}>{label}</div>
      {payload
        .filter((entry: any) => entry.value !== null && entry.value !== undefined)
        .map((entry: any) => (
          <div key={entry.dataKey} style={{ color: entry.dataKey === 'kmAlLitroAuto' ? '#94a3b8' : '#fff', fontSize: 12 }}>
            {entry.dataKey === 'kmAlLitroAuto' ? 'Km/Lt Auto' : 'Km/Lt'}: {fmtNum(entry.value)} km/lt
          </div>
        ))}
    </div>
  );
}
