import React, { useState } from 'react';
import { ArrowDownRight, ArrowUpRight, ArrowLeftRight } from 'lucide-react';
import Modal from '../Modal';
import AggiungiUscitaForm from '../uscite/AggiungiUscitaForm';
import AggiungiEntrataForm from '../entrate/AggiungiEntrataForm';
import AggiungiTrasferimentoForm from '../trasferimenti/AggiungiTrasferimentoForm';
import { formatEuro } from '../../utils/format';
import type { MovimentoDaConfermare } from '../../hooks/useMovimentiBanca';
import { descrizioneBreve, contoNellaCausale, dataProbabile } from '../../utils/movimentiBanca';
import { useDatiBase } from '../../hooks/useDatiBase';

type Tipo = 'uscita' | 'entrata' | 'trasferimento';

interface RegistraMovimentoModalProps {
  movimento: MovimentoDaConfermare | null;
  onClose: () => void;
  onRegistrato: (m: MovimentoDaConfermare) => void;
}

// Colori del tipo selezionato: gli stessi del pulsante "Aggiungi" di ogni modulo.
const TIPI: { id: Tipo; label: string; icon: React.ComponentType<{ className?: string }>; attivo: string }[] = [
  { id: 'uscita', label: 'Uscita', icon: ArrowDownRight, attivo: 'bg-orange-700 text-white' },
  { id: 'entrata', label: 'Entrata', icon: ArrowUpRight, attivo: 'bg-emerald-600 text-white' },
  { id: 'trasferimento', label: 'Trasferimento', icon: ArrowLeftRight, attivo: 'bg-blue-600 text-white' }
];

/**
 * Registra un movimento bancario "da confermare" con gli STESSI moduli di
 * "Aggiungi Dato", precompilati con data, conto e importo della banca: resta
 * da scegliere categoria e descrizione. Il tipo proposto segue il segno (o la
 * regola che l'ha riconosciuto, es. Stipendio → Entrata) e si può cambiare.
 */
export default function RegistraMovimentoModal({ movimento, onClose, onRegistrato }: RegistraMovimentoModalProps) {
  return (
    <Modal isOpen={Boolean(movimento)} onClose={onClose} title="Registra movimento" borderless fullScreenOnMobile>
      {/* key: il contenuto riparte da zero per ogni movimento aperto */}
      {movimento && <Contenuto key={movimento.movimento.id} m={movimento} onRegistrato={() => onRegistrato(movimento)} />}
    </Modal>
  );
}

function Contenuto({ m, onRegistrato }: { m: MovimentoDaConfermare; onRegistrato: () => void }) {
  const { movimento, proposta } = m;
  const { conti } = useDatiBase();
  // L'altro lato di un trasferimento: dalla regola se lo sa, altrimenti dal
  // conto nominato nella causale (es. "... PER Accredito Scalable").
  const altroConto = (proposta?.tipo === 'trasferimento'
    ? (movimento.importo < 0 ? proposta.contoBeneficiario : proposta.contoOrdinante)
    : '') || contoNellaCausale(movimento.descrizione, conti, movimento.conto);
  const tipoProposto: Tipo = proposta?.tipo === 'trasferimento' ? 'trasferimento'
    : proposta?.tipo === 'entrata' || movimento.importo > 0 ? 'entrata' : 'uscita';
  const [tipo, setTipo] = useState<Tipo>(tipoProposto);

  const [anno, mese] = movimento.data.split('-').map(Number);
  const importo = Math.abs(movimento.importo);

  return (
    <div className="space-y-4">
      <div className="p-3 rounded-2xl bg-canvas dark:bg-white/5 text-xs text-ink-soft leading-relaxed">
        <div className="flex items-center justify-between gap-3 mb-1">
          <span className="font-bold text-ink dark:text-slate-200">
            {movimento.conto} · {dataProbabile(movimento).split('-').reverse().join('/')}
            {dataProbabile(movimento) !== movimento.data && (
              <span className="font-normal"> (in banca il {movimento.data.split('-').reverse().join('/')})</span>
            )}
          </span>
          <span className={`font-bold ${movimento.importo < 0 ? 'text-down' : 'text-up'}`}>{formatEuro(movimento.importo)}</span>
        </div>
        {movimento.descrizione || 'La banca non indica la causale (pagamento con carta).'}
      </div>

      <div className="grid grid-cols-3 gap-2" role="tablist">
        {TIPI.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tipo === t.id}
              onClick={() => setTipo(t.id)}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                tipo === t.id ? t.attivo : 'bg-canvas dark:bg-white/10 text-ink-soft hover:text-ink dark:hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tipo === 'uscita' && (
        <AggiungiUscitaForm
          onSaved={onRegistrato}
          iniziale={{ data: dataProbabile(movimento), conto: movimento.conto, importo, descrizione: descrizioneBreve(movimento.descrizione) }}
        />
      )}
      {tipo === 'entrata' && (
        <AggiungiEntrataForm
          onSaved={onRegistrato}
          iniziale={{ meseIdx: mese - 1, anno, conto: movimento.conto, importo, categoria: proposta?.tipo === 'entrata' ? proposta.categoria : undefined }}
        />
      )}
      {tipo === 'trasferimento' && (
        <AggiungiTrasferimentoForm
          onSaved={onRegistrato}
          iniziale={{
            meseIdx: mese - 1,
            anno,
            importo,
            // Il lato noto è il conto del movimento; l'altro è altroConto, se si sa.
            contoOrdinante: movimento.importo < 0 ? movimento.conto : altroConto,
            contoBeneficiario: movimento.importo > 0 ? movimento.conto : altroConto
          }}
        />
      )}
    </div>
  );
}
