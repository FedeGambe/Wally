import React from 'react';
import type { TimeRange } from '../../hooks/useAnalisiConsumiData';

// Estratto da AnalisiConsumi.tsx: helper di formattazione/presentazione
// condivisi dai grafici storici della pagina (toggle range, tooltip, tick).

// Etichetta asse X compatta: solo mese abbreviato + anno a 2 cifre (es. "Gen W1 26" -> "Gen 26")
export function formatSettimanaTick(value: string): string {
  const parts = String(value).split(' ');
  return parts.length === 3 ? `${parts[0]} ${parts[2]}` : value;
}

// Etichetta asse Y: massimo 2 cifre decimali
export function formatAxisNumber(val: number): string {
  return Number(val).toLocaleString('it-IT', { maximumFractionDigits: 2 });
}
export function formatAxisEuro(val: number): string {
  return `€${formatAxisNumber(val)}`;
}

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
            {entry.dataKey === 'kmAlLitroAuto' ? 'Km/Lt Auto' : 'Km/Lt'}: {entry.value} km/lt
          </div>
        ))}
    </div>
  );
}
