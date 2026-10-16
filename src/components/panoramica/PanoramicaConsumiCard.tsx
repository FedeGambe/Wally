import React from 'react';
import { Fuel, ChevronRight } from 'lucide-react';
import { useAnalisiConsumiData } from '../../hooks/useAnalisiConsumiData';
import { formatEuro } from '../../utils/format';

interface PanoramicaConsumiCardProps {
  onOpen: () => void;
}

/**
 * Card "Consumi" della Home, solo su telefono: su mobile Analisi consumi non sta
 * nella barra in basso, ci si arriva da qui. Mostra l'ultima settimana registrata
 * (km/litro, €/100 km, esito) e al tocco apre la pagina completa.
 */
export default function PanoramicaConsumiCard({ onOpen }: PanoramicaConsumiCardProps) {
  const { consumiRecords } = useAnalisiConsumiData();
  const ultima = consumiRecords[consumiRecords.length - 1];

  return (
    <button
      type="button"
      onClick={onOpen}
      className="md:hidden w-full bg-white border border-hairline rounded-3xl p-5 shadow-xs text-left cursor-pointer active:scale-[0.99] transition-all"
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2">
          <span className="w-9 h-9 rounded-xl bg-down/10 text-down flex items-center justify-center">
            <Fuel className="w-4.5 h-4.5" />
          </span>
          <span>
            <span className="block text-sm font-bold text-ink">Analisi consumi</span>
            <span className="block text-2xs text-ink-soft">
              {ultima ? `Settimana del ${ultima.settimana}` : 'Nessun rifornimento registrato'}
            </span>
          </span>
        </span>
        <ChevronRight className="w-4.5 h-4.5 text-ink-soft" />
      </div>

      {ultima && (
        <div className="grid grid-cols-3 gap-2 mt-4">
          <div>
            <span className="block text-3xs uppercase tracking-wider text-ink-soft font-bold">Km/litro</span>
            <span className="block text-base font-black font-display text-ink">{ultima.kmAlLitro.toFixed(1)}</span>
          </div>
          <div>
            <span className="block text-3xs uppercase tracking-wider text-ink-soft font-bold">€/100 km</span>
            <span className="block text-base font-black font-display text-ink">{formatEuro(ultima.euroPer100Km)}</span>
          </div>
          <div>
            <span className="block text-3xs uppercase tracking-wider text-ink-soft font-bold">Esito</span>
            <span className="block text-sm font-bold text-ink mt-0.5">{ultima.esitoSettimana}</span>
          </div>
        </div>
      )}
    </button>
  );
}
