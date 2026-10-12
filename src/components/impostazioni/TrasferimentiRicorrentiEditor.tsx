import React, { useState } from 'react';
import { ArrowLeftRight, Repeat, CreditCard, ArrowRight } from 'lucide-react';
import { useDatiBase } from '../../hooks/useDatiBase';
import { formatEuro } from '../../utils/format';
import type { PresetTrasferimento } from '../../data/datiBase';
import DropdownMenu from '../DropdownMenu';
import { IntroEditor, ListaVoci, VoceRiga, AggiungiVoce, Campo, AzioniScheda, ErroreEditor, inputEditorClass, useScheda, useVoceAperta } from './editorUI';

const QUALSIASI = 'Qualsiasi';

/**
 * Editor "Trasferimenti Ricorrenti" (popup di Impostazioni → Preset
 * Ricorrenti). Ogni trasferimento è collegato per nome a un Preset Uscite
 * Ricorrenti: quando si registra quell'uscita (a mano o dalla banca) si
 * registra anche il trasferimento.
 */
export default function TrasferimentiRicorrentiEditor() {
  const { presetTrasferimenti, error } = useDatiBase();
  const [aperto, setAperto] = useVoceAperta<string>();
  const preset = presetTrasferimenti.find(p => p.id === aperto);
  useScheda(aperto === null ? null : aperto === 'nuova' ? 'Nuovo trasferimento ricorrente' : preset?.categoria ?? '', () => setAperto(null));

  if (aperto !== null) {
    return <SchedaPresetTrasferimento key={aperto} originale={preset ?? null} chiudi={() => setAperto(null)} />;
  }

  return (
    <div>
      <IntroEditor>
        Trasferimenti legati a un'uscita ricorrente (es. il bonifico verso il conto di
        accantonamento quando paghi una rata): registrando l'uscita si registra anche il
        trasferimento.
      </IntroEditor>
      <ListaVoci vuota="Nessun trasferimento ricorrente ancora.">
        {presetTrasferimenti.map(p => (
          <VoceRiga
            key={p.id}
            icona={<ArrowLeftRight className="w-4 h-4 text-blue-600" />}
            titolo={p.categoria}
            sottotitolo={`${p.contoOrdinante || QUALSIASI} → ${p.contoBeneficiario}`}
            valore={formatEuro(p.importo)}
            onClick={() => setAperto(p.id)}
          />
        ))}
      </ListaVoci>
      <AggiungiVoce label="Aggiungi trasferimento ricorrente" onClick={() => setAperto('nuova')} />
      <ErroreEditor errore={error} />
    </div>
  );
}

function SchedaPresetTrasferimento({ originale, chiudi }: { originale: PresetTrasferimento | null; chiudi: () => void }) {
  const { presetTrasferimenti, presetUscite, conti, updateDatiBase } = useDatiBase();
  const [form, setForm] = useState({
    categoria: originale?.categoria ?? '',
    contoOrdinante: originale?.contoOrdinante ?? '',
    contoBeneficiario: originale?.contoBeneficiario ?? '',
    importo: originale ? String(originale.importo) : ''
  });
  const aggiorna = (campi: Partial<typeof form>) => setForm(f => ({ ...f, ...campi }));

  // Ogni preset uscita ha al massimo un trasferimento collegato.
  const giaCollegati = presetTrasferimenti.filter(t => t.id !== originale?.id).map(t => t.categoria);
  const valido = Boolean(form.categoria && form.contoBeneficiario && Number(form.importo) > 0 && form.contoOrdinante !== form.contoBeneficiario);

  const salva = () => {
    if (!valido) return;
    const aggiornato: PresetTrasferimento = {
      id: originale?.id ?? `preset-trasf-${Date.now()}`,
      categoria: form.categoria,
      contoOrdinante: form.contoOrdinante,
      contoBeneficiario: form.contoBeneficiario,
      importo: Number(form.importo)
    };
    updateDatiBase({
      presetTrasferimenti: originale ? presetTrasferimenti.map(t => (t.id === originale.id ? aggiornato : t)) : [...presetTrasferimenti, aggiornato]
    });
    chiudi();
  };

  return (
    <div className="space-y-4">
      <Campo label="Collegato all'uscita ricorrente">
        <DropdownMenu
          icon={Repeat}
          label="Uscita ricorrente"
          accent="indigo"
          fullWidth
          hideLabel
          placeholder="Scegli un preset..."
          value={form.categoria}
          displayValue={form.categoria}
          options={presetUscite.map(p => p.nome)}
          disabledOptions={giaCollegati}
          onSelect={categoria => aggiorna({ categoria })}
        />
      </Campo>

      <div className="grid grid-cols-2 gap-3">
        <Campo label="Da">
          <DropdownMenu
            icon={CreditCard}
            label="Conto ordinante"
            accent="indigo"
            fullWidth
            hideLabel
            placeholder={QUALSIASI}
            value={form.contoOrdinante || QUALSIASI}
            displayValue={form.contoOrdinante || QUALSIASI}
            options={[QUALSIASI, ...conti]}
            onSelect={c => aggiorna({ contoOrdinante: c === QUALSIASI ? '' : c })}
          />
        </Campo>
        <Campo label="A">
          <DropdownMenu
            icon={ArrowRight}
            label="Conto beneficiario"
            accent="indigo"
            fullWidth
            hideLabel
            placeholder="Scegli..."
            value={form.contoBeneficiario}
            displayValue={form.contoBeneficiario}
            options={conti}
            onSelect={c => aggiorna({ contoBeneficiario: c })}
          />
        </Campo>
      </div>

      <Campo label="Importo">
        <div className="relative">
          <input type="number" inputMode="decimal" step="0.01" min="0.01" value={form.importo} onChange={e => aggiorna({ importo: e.target.value })} className={`${inputEditorClass} pr-8`} />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-soft">€</span>
        </div>
      </Campo>

      <AzioniScheda
        onSalva={salva}
        salvaAbilitato={valido}
        etichettaSalva={originale ? 'Salva' : 'Aggiungi preset'}
        onElimina={originale ? () => { updateDatiBase({ presetTrasferimenti: presetTrasferimenti.filter(t => t.id !== originale.id) }); chiudi(); } : undefined}
      />
    </div>
  );
}
