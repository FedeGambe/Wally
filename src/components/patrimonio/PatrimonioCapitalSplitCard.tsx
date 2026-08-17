import React from 'react';
import { Wallet } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { formatEuro } from '../../utils/format';
import type { ContoPatrimonio } from '../../data/mockData';

// Estratto da Patrimonio.tsx: torta "Suddivisione Capitale" (Disponibile/
// Investito/Accantonato) con anello esterno che mostra come ogni categoria
// si ripartisce tra i singoli conti.

const renderPieTooltip = ({ active, payload }: any) => {
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
};

// Schiarisce un colore hex verso il bianco in base a `amount` (0 = colore originale, 1 = bianco).
function shadeHex(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const mix = (channel: number) => Math.round(channel + (255 - channel) * amount);
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return `rgb(${r}, ${g}, ${b})`;
}

interface PatrimonioCapitalSplitCardProps {
  totalDisponibile: number;
  totalInvestito: number;
  totalImpegnato: number;
  localConti: ContoPatrimonio[];
}

export default function PatrimonioCapitalSplitCard({
  totalDisponibile,
  totalInvestito,
  totalImpegnato,
  localConti
}: PatrimonioCapitalSplitCardProps) {
  // Si filtrano le voci a 0 per non disegnare fette vuote (es. se non ci sono capitali accantonati).
  const splitCapitalData = [
    { name: 'Disponibile', value: totalDisponibile, color: '#10b981' },
    { name: 'Investito', value: totalInvestito, color: '#0ea5e9' },
    { name: 'Accantonato', value: totalImpegnato, color: '#f59e0b' }
  ].filter(item => item.value > 0);

  // Torta esterna sottile: per ogni fetta della torta interna mostra come quella
  // stessa categoria si ripartisce tra i conti, nello stesso ordine e con lo
  // stesso angolo totale della fetta interna corrispondente. Colore = colore
  // della categoria, sfumato più chiaro per ogni conto successivo così i conti
  // restano distinguibili al passaggio del mouse.
  const CATEGORY_FIELD: Record<string, 'capitaleDisponibile' | 'capitaleInvestito' | 'capitaleImpegnato'> = {
    Disponibile: 'capitaleDisponibile',
    Investito: 'capitaleInvestito',
    Accantonato: 'capitaleImpegnato'
  };
  const contoCapitalData = splitCapitalData.flatMap(cat => {
    const field = CATEGORY_FIELD[cat.name];
    const contiInCategoria = localConti.filter(c => c[field] > 0);
    return contiInCategoria.map((c, idx) => ({
      name: `${c.categoria} · ${cat.name}`,
      value: c[field],
      color: shadeHex(cat.color, idx / Math.max(contiInCategoria.length, 1))
    }));
  });

  return (
    <div className="bg-white p-6 rounded-3xl border border-hairline shadow-sm text-left transition-all duration-300 hover:shadow-md flex flex-col">
      <div className="flex items-center gap-2">
        <Wallet className="w-5 h-5 text-amber-500" />
        <div>
          <h3 className="font-bold text-ink font-display text-base leading-snug">Suddivisione Capitale</h3>
          <p className="text-xs text-ink-soft mt-0.5">Ripartizione tra capitale disponibile, investito e accantonato</p>
        </div>
      </div>

      <div className="h-64 mt-4 flex items-stretch gap-4">
        {splitCapitalData.length > 0 ? (
          <>
            <div className="flex-1 min-w-0 h-full min-h-[120px] relative pointer-events-none md:pointer-events-auto">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip wrapperStyle={{ zIndex: 50 }} content={renderPieTooltip} />
                  {/* Torta esterna sottile: suddivisione per conto (dove sono i capitali) */}
                  {contoCapitalData.length > 0 && (
                    <Pie
                      data={contoCapitalData}
                      cx="50%"
                      cy="50%"
                      innerRadius="88%"
                      outerRadius="95%"
                      paddingAngle={1}
                      stroke="none"
                      dataKey="value"
                    >
                      {contoCapitalData.map((entry, index) => (
                        <Cell key={`conto-cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  )}
                  <Pie
                    data={splitCapitalData}
                    cx="50%"
                    cy="50%"
                    innerRadius="55%"
                    outerRadius="85%"
                    paddingAngle={0}
                    stroke="none"
                    dataKey="value"
                  >
                    {splitCapitalData.map((entry, index) => (
                      <Cell key={`split-cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                <span className="text-3xs text-ink-soft font-bold block uppercase tracking-wider">Totale</span>
                <span className="text-sm font-black font-display text-amber-500">{formatEuro(totalDisponibile + totalInvestito + totalImpegnato)}</span>
              </div>
            </div>
            <div className="flex flex-col gap-2 shrink-0 max-w-[30%] h-full pr-1">
              {splitCapitalData.map((item, idx) => (
                <div key={idx} className="flex items-start gap-1.5">
                  <span className="w-2 h-2 rounded-full mt-1 shrink-0" style={{ backgroundColor: item.color }} />
                  <div className="min-w-0">
                    <span className="text-ink-soft font-medium text-3xs block truncate">{item.name}</span>
                    <span className="font-bold text-ink text-2xs block">{formatEuro(item.value)}</span>
                  </div>
                </div>
              ))}
              {contoCapitalData.length > 0 && (
                <div className="mt-1 pt-2 border-t border-hairline space-y-2 flex-1 min-h-0 overflow-y-auto">
                  <span className="text-3xs text-ink-soft font-bold uppercase tracking-wider block">Per conto</span>
                  {contoCapitalData.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-1.5">
                      <span className="w-2 h-2 rounded-full mt-1 shrink-0" style={{ backgroundColor: item.color }} />
                      <div className="min-w-0">
                        <span className="text-ink-soft font-medium text-3xs block truncate" title={item.name}>{item.name}</span>
                        <span className="font-bold text-ink text-2xs block">{formatEuro(item.value)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="w-full text-center text-xs text-ink-soft font-medium">
            Nessun capitale presente nel foglio Google Sheets
          </div>
        )}
      </div>
    </div>
  );
}
