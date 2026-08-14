import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { formatEuro } from '../../utils/format';

interface EntratePieCardEntry {
  name: string;
  value: number;
}

interface EntratePieCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  data: EntratePieCardEntry[];
  colors: string[];
  colorOffset?: number;
  emptyMessage: string;
}

// Tooltip custom per i grafici a torta (Recharts passa "active"/"payload"
// quando il mouse è sopra una fetta): mostriamo solo nome + importo in euro.
function renderPieTooltip({ active, payload }: any) {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0];
  return (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(30,41,59,0.92), rgba(15,23,42,0.96))',
        backdropFilter: 'blur(4px)',
        border: 'none',
        borderRadius: '12px',
        color: '#fff',
        fontSize: '12px',
        padding: '8px 12px'
      }}
    >
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.payload.color || p.color }} />
        <span><strong>{p.name}</strong>: {formatEuro(Number(p.value))}</span>
      </div>
    </div>
  );
}

/**
 * Torta + legenda per la distribuzione delle entrate del mese (per categoria
 * o per conto di accredito) — a differenza di CategoryPieCard (Uscite), qui
 * niente selezione/evidenziazione: le entrate non hanno quel filtro.
 */
export default function EntratePieCard({ icon: Icon, title, subtitle, data, colors, colorOffset = 0, emptyMessage }: EntratePieCardProps) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-hairline shadow-sm text-left transition-all duration-300 hover:shadow-md">
      <h3 className="font-bold text-ink font-display text-base flex items-center gap-2">
        <Icon className="w-5 h-5 text-up" />
        {title}
      </h3>
      <p className="text-xs text-ink-soft mt-1">{subtitle}</p>

      <div className="flex flex-col sm:flex-row items-center justify-around gap-6 mt-6">
        {data.length === 0 ? (
          <div className="h-44 w-full flex flex-col items-center justify-center text-center text-ink-soft">
            <Icon className="w-8 h-8 text-slate-300 mb-2" />
            <p className="text-xs">{emptyMessage}</p>
          </div>
        ) : (
          <>
            <div className="h-44 w-44 shrink-0 pointer-events-none md:pointer-events-auto">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={0}
                    stroke="none"
                    dataKey="value"
                    isAnimationActive={false}
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={colors[(index + colorOffset) % colors.length]} />
                    ))}
                  </Pie>
                  <Tooltip wrapperStyle={{ zIndex: 50 }} content={renderPieTooltip} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2.5 text-xs w-full max-w-xs">
              {data.map((entry, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors[(idx + colorOffset) % colors.length] }} />
                    <span className="text-ink-soft font-semibold truncate">{entry.name}</span>
                  </div>
                  <span className="font-bold text-ink">{formatEuro(entry.value)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
