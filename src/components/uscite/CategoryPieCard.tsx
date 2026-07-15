import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { formatEuro } from '../../utils/format';

/**
 * Torta + legenda cliccabile per la distribuzione di un importo su categorie
 * (es. spese per macro/micro categoria). Ogni fetta/riga della legenda seleziona
 * quella categoria (le altre si affievoliscono); ricliccare la categoria già
 * selezionata torna a "Tutte". Estratto da Uscite.tsx dove lo stesso markup era
 * duplicato identico per la torta Macro e per quella Micro Categoria.
 */
interface CategoryDistributionEntry {
  name: string;
  value: number;
}

interface CategoryPieCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  data: CategoryDistributionEntry[];
  colors: string[];
  colorOffset?: number;
  selected: string;
  allValue?: string;
  onSelect: (name: string) => void;
  containerRef?: React.RefObject<HTMLDivElement | null>;
  highlighted?: boolean;
}

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

export default function CategoryPieCard({
  icon: Icon,
  title,
  subtitle,
  data,
  colors,
  colorOffset = 0,
  selected,
  allValue = 'Tutte',
  onSelect,
  containerRef,
  highlighted = false
}: CategoryPieCardProps) {
  const toggle = (name: string) => onSelect(selected === name ? allValue : name);

  return (
    <div
      ref={containerRef}
      className={`bg-white p-6 rounded-3xl border shadow-sm text-left transition-all duration-300 hover:shadow-md ${
        highlighted ? 'border-orange-400 ring-4 ring-orange-400/30' : 'border-slate-200'
      }`}
    >
      <h3 className="font-bold text-slate-800 font-display text-base flex items-center gap-2">
        <Icon className="w-5 h-5 text-orange-600" />
        {title}
      </h3>
      <p className="text-xs text-slate-400 mt-1">{subtitle}</p>

      <div className="flex flex-col sm:flex-row items-center justify-around gap-6 mt-6">
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
                {data.map((entry, index) => {
                  const name = entry.name || 'Altro';
                  const isSelected = selected === name;
                  const isAnySelected = selected !== allValue;
                  const cellOpacity = isAnySelected ? (isSelected ? 1.0 : 0.35) : 1.0;
                  const cellStroke = isSelected ? '#1e293b' : 'none';
                  const cellStrokeWidth = isSelected ? 2 : 0;

                  return (
                    <Cell
                      key={`pie-cell-${index}-${entry.name}`}
                      fill={colors[(index + colorOffset) % colors.length]}
                      opacity={cellOpacity}
                      stroke={cellStroke}
                      strokeWidth={cellStrokeWidth}
                      style={{ cursor: 'pointer', outline: 'none' }}
                      onClick={() => toggle(name)}
                    />
                  );
                })}
              </Pie>
              <Tooltip wrapperStyle={{ zIndex: 50 }} content={renderPieTooltip} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-2 text-xs w-full max-w-xs overflow-y-auto max-h-48 pr-2">
          {data.map((entry, idx) => {
            const name = entry.name || 'Altro';
            const isSelected = selected === name;
            return (
              <div
                key={`pie-list-${idx}-${entry.name}`}
                onClick={() => toggle(name)}
                className={`flex items-center justify-between p-1.5 rounded-xl transition-all cursor-pointer select-none ${
                  isSelected
                    ? 'bg-indigo-50/70 dark:bg-indigo-400/10 border border-indigo-200/50 dark:border-indigo-400/20 shadow-xs'
                    : 'hover:bg-slate-50 dark:hover:bg-white/5 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: colors[(idx + colorOffset) % colors.length] }} />
                  <span className={`text-slate-600 dark:text-slate-300 truncate ${isSelected ? 'font-bold text-indigo-700 dark:text-indigo-300' : 'font-semibold'}`}>{name}</span>
                </div>
                <span className={`font-bold ${isSelected ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-800 dark:text-slate-100'}`}>{formatEuro(entry.value)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
