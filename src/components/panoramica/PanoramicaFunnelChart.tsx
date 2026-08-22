import React, { useState } from 'react';
import { Waypoints } from 'lucide-react';
import { ResponsiveContainer, Sankey } from 'recharts';
import { formatEuro } from '../../utils/format';
import { usePanoramicaFunnelData } from '../../hooks/usePanoramicaFunnelData';

interface PanoramicaFunnelChartProps {
  data: any;
  mese: string;
  anno: number;
  theme: 'dark' | 'light';
}

const truncate = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/**
 * Sankey "Flusso del Mese": dalle Entrate del mese selezionato ai due rami
 * paralleli Investimenti (per asset class poi per singolo strumento) e Uscite
 * Primarie/Secondarie (per macro categoria). I dati vengono da
 * usePanoramicaFunnelData; qui c'è solo il disegno (nodi/link custom sopra
 * Sankey di Recharts, per colorare per ramo e mostrare l'etichetta solo sui
 * nodi "riassuntivi" — i singoli strumenti restano senza etichetta fissa,
 * visibili passando il mouse sul collegamento).
 */
export default function PanoramicaFunnelChart({ data, mese, anno, theme }: PanoramicaFunnelChartProps) {
  const funnel = usePanoramicaFunnelData(data, mese, anno);
  const [hoveredLink, setHoveredLink] = useState<number | null>(null);

  if (!funnel) return null;

  const { nodes, links } = funnel;
  const hovered = hoveredLink !== null ? links[hoveredLink] : null;
  const hoveredLabel = hovered ? `${nodes[hovered.source].name} → ${nodes[hovered.target].name}` : null;

  // In tema scuro i link a bassa opacità risultano troppo sbiaditi sullo
  // sfondo scuro della card: qui più pieni, in chiaro restano tenui come prima.
  const linkOpacity = theme === 'dark' ? 0.55 : 0.32;
  const linkOpacityDimmed = theme === 'dark' ? 0.12 : 0.08;

  const nodeIsActive = (index: number) =>
    hoveredLink === null || links[hoveredLink].source === index || links[hoveredLink].target === index;

  return (
    <div className="bg-white p-6 rounded-3xl border border-hairline shadow-sm text-left transition-all duration-300 hover:shadow-md">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-1">
        <div>
          <h3 className="font-bold text-ink font-display text-base flex items-center gap-1.5">
            <Waypoints className="w-5 h-5 text-blue-600" />
            Flusso del Mese
          </h3>
          <p className="text-xs text-ink-soft mt-1">
            {mese} {anno} — dalle entrate a investimenti (per strumento) e uscite primarie/secondarie (per macro categoria)
          </p>
        </div>
        <span className="text-xs font-bold text-ink-soft tabular-nums h-5">
          {hoveredLabel ? `${hoveredLabel}: ${formatEuro(hovered!.value)}` : ''}
        </span>
      </div>

      <div style={{ height: Math.max(420, nodes.length * 32) }}>
        <ResponsiveContainer width="100%" height="100%">
          <Sankey
            data={{ nodes, links }}
            nodeWidth={12}
            nodePadding={20}
            linkCurvature={0.55}
            margin={{ top: 8, right: 175, bottom: 8, left: 8 }}
            node={(props: any) => {
              const { x, y, width, height, payload, index } = props;
              const active = nodeIsActive(index);
              return (
                <g style={{ transition: 'opacity 0.15s ease' }} opacity={active ? 1 : 0.35}>
                  <rect x={x} y={y} width={width} height={Math.max(height, 2)} fill={payload.color} rx={2} />
                  {payload.showLabel && (
                    <>
                      <text x={x + width + 6} y={y + height / 2 - 3} fontSize={11} fontWeight={700} fill="#94a3b8">
                        {truncate(payload.name, 24)}
                      </text>
                      <text x={x + width + 6} y={y + height / 2 + 11} fontSize={10} fill="#94a3b8" fillOpacity={0.75}>
                        {formatEuro(payload.value)}
                      </text>
                    </>
                  )}
                </g>
              );
            }}
            link={(props: any) => {
              const { sourceX, sourceY, targetX, targetY, sourceControlX, targetControlX, linkWidth, index, payload } = props;
              const color = payload.source.color || '#94a3b8';
              const dimmed = hoveredLink !== null && hoveredLink !== index;
              return (
                <path
                  d={`M${sourceX},${sourceY} C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}`}
                  fill="none"
                  stroke={color}
                  strokeWidth={Math.max(linkWidth, 1)}
                  strokeOpacity={dimmed ? linkOpacityDimmed : linkOpacity}
                  style={{ cursor: 'pointer', transition: 'stroke-opacity 0.15s ease' }}
                  onMouseEnter={() => setHoveredLink(index)}
                  onMouseLeave={() => setHoveredLink(null)}
                />
              );
            }}
          />
        </ResponsiveContainer>
      </div>
    </div>
  );
}
