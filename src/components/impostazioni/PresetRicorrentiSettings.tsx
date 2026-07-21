import React, { useState } from 'react';
import { ChevronRight, Repeat, ArrowLeftRight, TrendingUp, PiggyBank } from 'lucide-react';
import Modal from '../Modal';
import UsciteRicorrentiEditor from './UsciteRicorrentiEditor';
import TrasferimentiRicorrentiEditor from './TrasferimentiRicorrentiEditor';
import InArrivoPlaceholder from './InArrivoPlaceholder';

type Voce = 'usciteRicorrenti' | 'trasferimentiRicorrenti' | 'investimentiRicorrenti' | 'fondoPensione' | null;

const VOCI: { id: Exclude<Voce, null>; label: string; desc: string; icon: React.ComponentType<{ className?: string }>; iconColor: string }[] = [
  { id: 'usciteRicorrenti', label: 'Uscite Ricorrenti', desc: 'Preset per uscite quasi identiche ogni mese (es. accantonamento)', icon: Repeat, iconColor: 'text-orange-600' },
  { id: 'trasferimentiRicorrenti', label: 'Trasferimenti Ricorrenti', desc: 'Preset per trasferimenti fissi tra conti', icon: ArrowLeftRight, iconColor: 'text-blue-600' },
  { id: 'investimentiRicorrenti', label: 'Investimenti Ricorrenti', desc: 'Preset per contributi mensili investimento', icon: TrendingUp, iconColor: 'text-sky-600' },
  { id: 'fondoPensione', label: 'Quota Fondo Pensione', desc: 'Contributo mensile ricorrente al fondo pensione', icon: PiggyBank, iconColor: 'text-up' }
];

const TITOLI: Record<Exclude<Voce, null>, string> = {
  usciteRicorrenti: 'Uscite Ricorrenti',
  trasferimentiRicorrenti: 'Trasferimenti Ricorrenti',
  investimentiRicorrenti: 'Investimenti Ricorrenti',
  fondoPensione: 'Quota Fondo Pensione'
};

/**
 * Card "Preset Uscite Ricorrenti" di Impostazioni: menu con 4 voci per i
 * valori che si ripetono quasi identici ogni mese (Fase 2 del piano,
 * docs/PIANO-INSERIMENTO-DATI.md). "Uscite Ricorrenti" e "Trasferimenti
 * Ricorrenti" hanno un editor vero (usati anche da AggiungiUscitaForm per il
 * flag "aggiungi anche il trasferimento"); Investimenti Ricorrenti e Quota
 * Fondo Pensione sono ancora da costruire.
 */
export default function PresetRicorrentiSettings() {
  const [voceAperta, setVoceAperta] = useState<Voce>(null);

  return (
    <div className="bg-white dark:bg-white/5 p-6 rounded-3xl border border-hairline dark:border-white/10 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <Repeat className="w-5 h-5 text-orange-600" />
        <h3 className="font-bold text-lg font-display text-ink dark:text-slate-100">Preset Uscite Ricorrenti</h3>
      </div>
      <p className="text-xs text-ink-soft mb-5 leading-relaxed">
        Valori quasi identici ogni mese: precompilano il form al momento dell'inserimento, non
        salvano nulla da soli.
      </p>

      <div className="space-y-2">
        {VOCI.map(v => {
          const Icon = v.icon;
          return (
            <button
              key={v.id}
              onClick={() => setVoceAperta(v.id)}
              className="w-full flex items-center gap-3 p-4 rounded-2xl border border-hairline dark:border-white/10 hover:border-hairline dark:hover:border-white/25 hover:bg-canvas dark:hover:bg-white/10 transition-all cursor-pointer text-left"
            >
              <div className={`w-10 h-10 rounded-xl bg-canvas dark:bg-white/10 flex items-center justify-center shrink-0 ${v.iconColor}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-bold text-ink dark:text-slate-100 block">{v.label}</span>
                <span className="text-xs text-ink-soft block truncate">{v.desc}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-ink-soft shrink-0" />
            </button>
          );
        })}
      </div>

      <Modal isOpen={voceAperta !== null} onClose={() => setVoceAperta(null)} title={voceAperta ? TITOLI[voceAperta] : ''} fullScreen>
        {voceAperta === 'usciteRicorrenti' && <UsciteRicorrentiEditor />}
        {voceAperta === 'trasferimentiRicorrenti' && <TrasferimentiRicorrentiEditor />}
        {voceAperta === 'investimentiRicorrenti' && <InArrivoPlaceholder label="Investimenti Ricorrenti" />}
        {voceAperta === 'fondoPensione' && <InArrivoPlaceholder label="Quota Fondo Pensione" />}
      </Modal>
    </div>
  );
}
