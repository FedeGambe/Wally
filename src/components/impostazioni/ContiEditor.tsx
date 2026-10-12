import React, { useState } from 'react';
import { Wallet } from 'lucide-react';
import { useDatiBase } from '../../hooks/useDatiBase';
import { IntroEditor, ListaVoci, VoceRiga, AggiungiVoce, Campo, AzioniScheda, ErroreEditor, inputEditorClass, useScheda, useVoceAperta } from './editorUI';

/**
 * Editor "Conti" (popup di Impostazioni → Dati Base): lista dei conti, tocchi
 * un conto per rinominarlo o eliminarlo. Rinominando, il nuovo nome vale anche
 * nei preset che lo usano; i movimenti già registrati restano col nome vecchio.
 */
export default function ContiEditor() {
  const { conti, presetUscite, presetTrasferimenti, error } = useDatiBase();
  const [aperto, setAperto] = useVoceAperta<string>();
  useScheda(aperto === null ? null : aperto === 'nuova' ? 'Nuovo conto' : aperto, () => setAperto(null));

  if (aperto !== null) {
    return <SchedaConto key={aperto} originale={aperto === 'nuova' ? null : aperto} chiudi={() => setAperto(null)} />;
  }

  return (
    <div>
      <IntroEditor>Conti usati nei moduli "Aggiungi" (Uscita, Entrata, Trasferimento).</IntroEditor>
      <ListaVoci vuota="Nessun conto ancora.">
        {conti.map(c => {
          const usi = presetUscite.filter(p => p.conto === c).length
            + presetTrasferimenti.filter(p => p.contoOrdinante === c || p.contoBeneficiario === c).length;
          return (
            <VoceRiga
              key={c}
              icona={<Wallet className="w-4 h-4 text-blue-600" />}
              titolo={c}
              sottotitolo={usi > 0 ? `Usato in ${usi} preset` : undefined}
              onClick={() => setAperto(c)}
            />
          );
        })}
      </ListaVoci>
      <AggiungiVoce label="Aggiungi conto" onClick={() => setAperto('nuova')} />
      <ErroreEditor errore={error} />
    </div>
  );
}

function SchedaConto({ originale, chiudi }: { originale: string | null; chiudi: () => void }) {
  const { conti, presetUscite, presetTrasferimenti, updateDatiBase } = useDatiBase();
  const [nome, setNome] = useState(originale ?? '');
  const pulito = nome.trim();
  const duplicato = pulito !== originale && conti.includes(pulito);
  const valido = Boolean(pulito) && !duplicato && pulito !== originale;

  const salva = () => {
    if (!valido) return;
    if (originale === null) {
      updateDatiBase({ conti: [...conti, pulito] });
    } else {
      const rinomina = (c: string) => (c === originale ? pulito : c);
      updateDatiBase({
        conti: conti.map(rinomina),
        presetUscite: presetUscite.map(p => ({ ...p, conto: rinomina(p.conto) })),
        presetTrasferimenti: presetTrasferimenti.map(p => ({ ...p, contoOrdinante: rinomina(p.contoOrdinante), contoBeneficiario: rinomina(p.contoBeneficiario) }))
      });
    }
    chiudi();
  };

  return (
    <div className="space-y-4">
      <Campo
        label="Nome del conto"
        nota={originale ? 'Il nuovo nome vale anche nei preset. I movimenti già registrati restano col nome vecchio.' : undefined}
      >
        <input
          autoFocus
          value={nome}
          onChange={e => setNome(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && salva()}
          placeholder="Es. Conto Arancio"
          className={inputEditorClass}
        />
      </Campo>
      {duplicato && <p className="text-xs text-down font-semibold">Esiste già un conto con questo nome.</p>}
      <AzioniScheda
        onSalva={salva}
        salvaAbilitato={valido}
        etichettaSalva={originale ? 'Salva' : 'Aggiungi conto'}
        onElimina={originale ? () => { updateDatiBase({ conti: conti.filter(c => c !== originale) }); chiudi(); } : undefined}
      />
    </div>
  );
}
