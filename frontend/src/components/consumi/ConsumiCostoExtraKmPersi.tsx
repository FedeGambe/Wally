import React from 'react';
import { AlertOctagon } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';
import { useIsMobile } from '../../hooks/useIsMobile';
import { formatEuro } from '../../utils/format';
import { monthAxisProps, fmtNum, formatAxisNumber, formatAxisEuro, SegmentedToggle, TOOLTIP_BOX, TOOLTIP_LABEL, tooltipItem } from './ConsumiChartHelpers';
import type { RecordConsumo, ExtraMode, ExtraUnit } from '../../hooks/useAnalisiConsumiData';

// Estratto da AnalisiConsumi.tsx: CONTENITORE 3 "Costo Extra o Risparmio",
// rispetto alla mediana storica di km/litro. Un solo grafico: costo extra (€) e
// km persi sono quasi la stessa misura, si sceglie quale vedere con € / Km, e
// Totale / Ogni 100 km. I valori hanno il segno: sopra lo zero (rosso) la
// settimana ha consumato più del solito, sotto (verde) ha risparmiato.

const ROSSO = '#e11d48';
const VERDE = '#10b981';

// Posizione dello zero nell'altezza del grafico (0 = in alto, 1 = in basso), per
// spezzare il gradiente: rosso sopra lo zero, verde sotto.
function offsetZero(records: RecordConsumo[], key: 'costoExtra' | 'kmPersi'): number {
  const valori = records.map(r => r[key]);
  const max = Math.max(...valori);
  const min = Math.min(...valori);
  if (max <= 0) return 0;
  if (min >= 0) return 1;
  return max / (max - min);
}

function GradienteSegno({ id, offset, fill }: { id: string; offset: number; fill?: boolean }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset={0} stopColor={ROSSO} stopOpacity={fill ? 0.25 : 1} />
      <stop offset={offset} stopColor={ROSSO} stopOpacity={fill ? 0.05 : 1} />
      <stop offset={offset} stopColor={VERDE} stopOpacity={fill ? 0.05 : 1} />
      <stop offset={1} stopColor={VERDE} stopOpacity={fill ? 0.25 : 1} />
    </linearGradient>
  );
}

interface ConsumiCostoExtraKmPersiProps {
  extraChartData: RecordConsumo[];
  extraMode: ExtraMode;
  setExtraMode: (mode: ExtraMode) => void;
  extraUnit: ExtraUnit;
  setExtraUnit: (unit: ExtraUnit) => void;
  handleChartClick: (event: any) => void;
}

export default function ConsumiCostoExtraKmPersi({
  extraChartData,
  extraMode,
  setExtraMode,
  extraUnit,
  setExtraUnit,
  handleChartClick
}: ConsumiCostoExtraKmPersiProps) {
  const isMobile = useIsMobile();
  const inEuro = extraUnit === 'euro';
  const key = inEuro ? 'costoExtra' : 'kmPersi';
  const offset = offsetZero(extraChartData, key);
  const suffisso = extraMode === 'perKm' ? ' ogni 100 km' : '';

  return (
    <div className="bg-white dark:bg-[#0c1425]/45 p-6 rounded-3xl border border-hairline dark:border-slate-800/80 shadow-sm text-left">
      <div className="flex items-start justify-between flex-wrap gap-2 mb-1">
        <h2 className="font-bold text-ink dark:text-slate-100 font-display text-sm flex items-center gap-1.5">
          <AlertOctagon className="w-4.5 h-4.5 text-rose-500 dark:text-rose-400" />
          {inEuro ? 'Costo Extra o Risparmio' : 'Km Persi o Guadagnati'}
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          <SegmentedToggle<ExtraUnit>
            value={extraUnit}
            onChange={setExtraUnit}
            options={[{ value: 'euro', label: '€' }, { value: 'km', label: 'Km' }]}
          />
          <SegmentedToggle<ExtraMode>
            value={extraMode}
            onChange={setExtraMode}
            options={[{ value: 'accumulato', label: 'Totale' }, { value: 'perKm', label: 'Ogni 100 km' }]}
          />
        </div>
      </div>
      <p className="text-2xs text-ink-soft dark:text-slate-500 mb-4">
        {inEuro
          ? 'Euro spesi in più (sopra lo zero) o risparmiati (sotto) rispetto al tuo consumo mediano'
          : 'Km in meno (sopra lo zero) o in più (sotto) fatti con gli stessi litri rispetto al tuo consumo mediano'}
      </p>
      <div className="h-52">
        {extraChartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-500 text-xs">Nessun dato registrato</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={extraChartData}
              margin={{ top: 10, right: 10, left: isMobile ? 0 : 10, bottom: 0 }}
              onClick={handleChartClick}
            >
              <defs>
                <GradienteSegno id="strokeExtra" offset={offset} />
                <GradienteSegno id="fillExtra" offset={offset} fill />
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-slate-100, #f1f5f9)" className="dark:opacity-10" />
              <XAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} {...monthAxisProps(extraChartData, isMobile)} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} width={isMobile ? 44 : 60} tickFormatter={inEuro ? formatAxisEuro : formatAxisNumber} domain={['auto', 'auto']} />
              <ReferenceLine y={0} stroke="#94a3b8" strokeOpacity={0.6} />
              <Tooltip
                contentStyle={TOOLTIP_BOX}
                labelStyle={TOOLTIP_LABEL}
                    separator=": "
                itemStyle={tooltipItem('#fff')}
                formatter={(value: any) => inEuro
                  ? [formatEuro(Math.abs(value)) + suffisso, value < 0 ? 'Risparmio' : 'Costo Extra']
                  : [`${fmtNum(Math.abs(value))} Km${suffisso}`, value < 0 ? 'Km Guadagnati' : 'Km Persi']}
              />
              <Area type="monotone" dataKey={key} stroke="url(#strokeExtra)" strokeWidth={2.5} fillOpacity={1} fill="url(#fillExtra)" dot={false} activeDot={{ r: 5, cursor: 'pointer' }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
