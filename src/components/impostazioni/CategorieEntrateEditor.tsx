import React, { useState } from 'react';
import { ArrowDownCircle } from 'lucide-react';
import { useDatiBase } from '../../hooks/useDatiBase';
import { IntroEditor, ListaVoci, VoceRiga, AggiungiVoce, Campo, AzioniScheda, ErroreEditor, inputEditorClass, useScheda, useVoceAperta } from './editorUI';

/** Editor "Categorie Entrate" (popup di Impostazioni → Dati Base): lista → scheda per rinominare o eliminare. */
export default function CategorieEntrateEditor() {
  const { categorieEntrate, error } = useDatiBase();
  const [aperta, setAperta] = useVoceAperta<string>();
  useScheda(aperta === null ? null : aperta === 'nuova' ? 'Nuova categoria' : aperta, () => setAperta(null));

  if (aperta !== null) {
    return <SchedaCategoria key={aperta} originale={aperta === 'nuova' ? null : aperta} chiudi={() => setAperta(null)} />;
  }

  return (
    <div>
      <IntroEditor>Categorie del modulo "Aggiungi Entrata" (es. Stipendio, Dividendi...).</IntroEditor>
      <ListaVoci vuota="Nessuna categoria ancora.">
        {categorieEntrate.map(c => (
          <VoceRiga key={c} icona={<ArrowDownCircle className="w-4 h-4 text-up" />} titolo={c} onClick={() => setAperta(c)} />
        ))}
      </ListaVoci>
      <AggiungiVoce label="Aggiungi categoria" onClick={() => setAperta('nuova')} />
      <ErroreEditor errore={error} />
    </div>
  );
}

function SchedaCategoria({ originale, chiudi }: { originale: string | null; chiudi: () => void }) {
  const { categorieEntrate, updateDatiBase } = useDatiBase();
  const [nome, setNome] = useState(originale ?? '');
  const pulito = nome.trim();
  const duplicato = pulito !== originale && categorieEntrate.includes(pulito);
  const valido = Boolean(pulito) && !duplicato && pulito !== originale;

  const salva = () => {
    if (!valido) return;
    updateDatiBase({
      categorieEntrate: originale === null ? [...categorieEntrate, pulito] : categorieEntrate.map(c => (c === originale ? pulito : c))
    });
    chiudi();
  };

  return (
    <div className="space-y-4">
      <Campo label="Nome della categoria" nota={originale ? 'Le entrate già registrate restano col nome vecchio.' : undefined}>
        <input
          autoFocus
          value={nome}
          onChange={e => setNome(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && salva()}
          placeholder="Es. Rimborsi"
          className={inputEditorClass}
        />
      </Campo>
      {duplicato && <p className="text-xs text-down font-semibold">Esiste già una categoria con questo nome.</p>}
      <AzioniScheda
        onSalva={salva}
        salvaAbilitato={valido}
        etichettaSalva={originale ? 'Salva' : 'Aggiungi categoria'}
        onElimina={originale ? () => { updateDatiBase({ categorieEntrate: categorieEntrate.filter(c => c !== originale) }); chiudi(); } : undefined}
      />
    </div>
  );
}
