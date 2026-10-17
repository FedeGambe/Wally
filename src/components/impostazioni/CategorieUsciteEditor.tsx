import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useDatiBase } from '../../hooks/useDatiBase';
import { IntroEditor, ListaVoci, VoceRiga, AggiungiVoce, Campo, AzioniScheda, ErroreEditor, inputEditorClass, useScheda, useVoceAperta } from './editorUI';

/**
 * Editor "Categorie Uscite" (popup di Impostazioni → Dati Base): lista delle
 * macro categorie → scheda con icona, nome e sotto-categorie. Una macro senza
 * sotto-categorie (es. Istruzione, Regalo) diventa "inserimento libero" nel
 * modulo Aggiungi Uscita. Le modifiche si applicano con "Salva".
 */
export default function CategorieUsciteEditor() {
  const { macroCategorieUscite, error } = useDatiBase();
  const [aperta, setAperta] = useVoceAperta<string>();
  const macro = macroCategorieUscite.find(m => m.nome === aperta);
  useScheda(aperta === null ? null : aperta === 'nuova' ? 'Nuova macro categoria' : `${macro?.icon ?? ''} ${aperta}`.trim(), () => setAperta(null));

  if (aperta !== null) {
    return <SchedaMacro key={aperta} originale={aperta === 'nuova' ? null : aperta} chiudi={() => setAperta(null)} />;
  }

  return (
    <div>
      <IntroEditor>Macro categorie e sotto-categorie del modulo "Aggiungi Uscita".</IntroEditor>
      <ListaVoci vuota="Nessuna macro categoria ancora.">
        {macroCategorieUscite.map(m => (
          <VoceRiga
            key={m.nome}
            icona={m.icon}
            titolo={m.nome}
            sottotitolo={m.categorie.length > 0 ? m.categorie.join(' · ') : 'Inserimento libero'}
            onClick={() => setAperta(m.nome)}
          />
        ))}
      </ListaVoci>
      <AggiungiVoce label="Aggiungi macro categoria" onClick={() => setAperta('nuova')} />
      <ErroreEditor errore={error} />
    </div>
  );
}

function SchedaMacro({ originale, chiudi }: { originale: string | null; chiudi: () => void }) {
  const { macroCategorieUscite, presetUscite, updateDatiBase } = useDatiBase();
  const esistente = macroCategorieUscite.find(m => m.nome === originale);
  const [icona, setIcona] = useState(esistente?.icon ?? '💸');
  const [nome, setNome] = useState(esistente?.nome ?? '');
  const [categorie, setCategorie] = useState<string[]>(esistente?.categorie ?? []);
  const [nuova, setNuova] = useState('');

  const pulito = nome.trim();
  const duplicato = pulito !== originale && macroCategorieUscite.some(m => m.nome === pulito);
  const modificata = !esistente || pulito !== esistente.nome || icona !== esistente.icon || categorie.join('|') !== esistente.categorie.join('|');
  const valido = Boolean(pulito) && !duplicato && modificata;

  const aggiungiCategoria = () => {
    const c = nuova.trim();
    if (c && !categorie.includes(c)) setCategorie([...categorie, c]);
    setNuova('');
  };

  const salva = () => {
    if (!valido) return;
    const aggiornata = { nome: pulito, icon: icona.trim() || '💸', categorie };
    updateDatiBase({
      macroCategorieUscite: originale === null
        ? [...macroCategorieUscite, aggiornata]
        : macroCategorieUscite.map(m => (m.nome === originale ? aggiornata : m)),
      // Il nuovo nome della macro vale anche nei Preset Uscite Ricorrenti.
      ...(originale && pulito !== originale
        ? { presetUscite: presetUscite.map(p => (p.macroCategoria === originale ? { ...p, macroCategoria: pulito } : p)) }
        : {})
    });
    chiudi();
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="w-20 shrink-0">
          <Campo label="Icona">
            <input value={icona} onChange={e => setIcona(e.target.value)} maxLength={4} className={`${inputEditorClass} text-center text-lg`} />
          </Campo>
        </div>
        <div className="flex-1">
          <Campo label="Nome">
            <input autoFocus={!originale} value={nome} onChange={e => setNome(e.target.value)} placeholder="Es. Casa" className={inputEditorClass} />
          </Campo>
        </div>
      </div>
      {duplicato && <p className="text-xs text-down font-semibold">Esiste già una macro categoria con questo nome.</p>}

      <Campo label="Sotto-categorie" nota={categorie.length === 0 ? 'Senza sotto-categorie, nel modulo Aggiungi Uscita la categoria si scrive a mano.' : undefined}>
        {categorie.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {categorie.map(c => (
              <span key={c} className="inline-flex items-center gap-1 pl-3 pr-1.5 py-1.5 rounded-lg bg-accent/10 text-accent text-xs font-semibold">
                {c}
                <button
                  type="button"
                  onClick={() => setCategorie(categorie.filter(x => x !== c))}
                  aria-label={`Togli ${c}`}
                  className="relative w-5 h-5 rounded-md flex items-center justify-center hover:bg-accent/20 cursor-pointer after:absolute after:-inset-2 after:content-['']"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            value={nuova}
            onChange={e => setNuova(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && aggiungiCategoria()}
            placeholder="Nuova sotto-categoria..."
            className={inputEditorClass}
          />
          <button
            type="button"
            onClick={aggiungiCategoria}
            disabled={!nuova.trim()}
            aria-label="Aggiungi sotto-categoria"
            className="px-3 rounded-xl bg-canvas dark:bg-white/10 text-accent hover:bg-accent/10 disabled:opacity-40 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </Campo>

      <AzioniScheda
        onSalva={salva}
        salvaAbilitato={valido}
        etichettaSalva={originale ? 'Salva' : 'Aggiungi macro categoria'}
        onElimina={originale ? () => { updateDatiBase({ macroCategorieUscite: macroCategorieUscite.filter(m => m.nome !== originale) }); chiudi(); } : undefined}
      />
    </div>
  );
}
