import React from 'react';
import { Coins } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { formatEuro } from '../../utils/format';

// Estratto da Patrimonio.tsx: torta "Capitale Accantonato", suddivisione del
// capitale vincolato/impegnato per conto.

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

interface PatrimonioEngagedCapitalCardProps {
  engagedCapitalData: { name: string; value: number }[];
  colors: string[];
  totalImpegnato: number;
}

export default function PatrimonioEngagedCapitalCard({
  engagedCapitalData,
  colors,
  totalImpegnato
}: PatrimonioEngagedCapitalCardProps) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-hairline shadow-sm text-left transition-all duration-300 hover:shadow-md flex flex-col">
      <div className="flex items-center gap-2">
        <Coins className="w-5 h-5 text-amber-500" />
        <div>
          <h3 className="font-bold text-ink font-display text-base leading-snug">Capitale Accantonato</h3>
          <p className="text-xs text-ink-soft mt-0.5">Suddivisione del capitale vincolato e dei debiti attivi per conto</p>
        </div>
      </div>

      <div className="h-64 mt-4 flex items-stretch gap-4">
        {engagedCapitalData.length > 0 ? (
          <>
            <div className="flex-1 min-w-0 h-full min-h-[120px] relative pointer-events-none md:pointer-events-auto">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip wrapperStyle={{ zIndex: 50 }} content={renderPieTooltip} />
                  <Pie
                    data={engagedCapitalData}
                    cx="50%"
                    cy="50%"
                    innerRadius="55%"
                    outerRadius="85%"
                    paddingAngle={0}
                    stroke="none"
                    dataKey="value"
                  >
                    {engagedCapitalData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                <span className="text-[10px] text-ink-soft font-bold block uppercase tracking-wider">Totale</span>
                <span className="text-sm font-black font-display text-amber-500">{formatEuro(totalImpegnato)}</span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 shrink-0 max-w-[30%] h-full overflow-y-auto pr-1">
              {engagedCapitalData.map((item, idx) => (
                <div key={idx} className="flex items-start gap-1.5">
                  <span className="w-2 h-2 rounded-full mt-1 shrink-0" style={{ backgroundColor: colors[idx % colors.length] }} />
                  <div className="min-w-0">
                    <span className="text-ink-soft font-medium text-[10px] block truncate" title={item.name}>{item.name}</span>
                    <span className="font-bold text-ink text-[11px] block">{formatEuro(item.value)}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="w-full text-center text-xs text-ink-soft font-medium">
            Nessun capitale accantonato presente nel foglio Google Sheets
          </div>
        )}
      </div>
    </div>
  );
}
