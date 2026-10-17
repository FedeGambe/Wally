import React, { useState } from 'react';
import { Grid, Tag, CreditCard } from 'lucide-react';
import { useDatiBase } from '../../hooks/useDatiBase';
import { formatEuro } from '../../utils/format';
import type { PresetUscita } from '../../data/datiBase';
import DropdownMenu from '../DropdownMenu';
import { IntroEditor, ListaVoci, VoceRiga, AggiungiVoce, Campo, AzioniScheda, ErroreEditor, inputEditorClass, useScheda, useVoceAperta } from './editorUI';

/**
 * Editor "Uscite Ricorrenti" (popup di Impostazioni → Preset Ricorrenti):
 * template per uscite quasi identiche ogni mese (es. accantonamento). Li usa
 * AggiungiUscitaForm per precompilare il modulo, e la sincronizzazione
 * bancaria per riconoscere i bonifici (il nome del preset nella causale).
 */
export default function UsciteRicorrentiEditor() {
  const { presetUscite, presetTrasferimenti, macroCategorieUscite, error } = useDatiBase();
  const [aperto, setAperto] = useVoceAperta<string>();
  const preset = presetUscite.find(p => p.id === aperto);
  useScheda(aperto === null ? null : aperto === 'nuova' ? 'Nuova uscita ricorrente' : preset?.nome ?? '', () => setAperto(null));

  if (aperto !== null) {
    return <SchedaPresetUscita key={aperto} originale={preset ?? null} chiudi={() => setAperto(null)} />;
  }

  const icona = (macro: string) => macroCategorieUscite.find(m => m.nome === macro)?.icon ?? '💸';

  return (
    <div>
      <IntroEditor>
        Uscite quasi identiche ogni mese (es. le rate di accantonamento). Scegli il preset in
        "Aggiungi Uscita" e il modulo si compila da solo.
      </IntroEditor>
      <ListaVoci vuota="Nessuna uscita ricorrente ancora.">
        {[...presetUscite].sort((a, b) => a.giornoDelMese - b.giornoDelMese).map(p => {
          const conTrasferimento = presetTrasferimenti.some(t => t.categoria === p.nome);
          return (
            <VoceRiga
              key={p.id}
              icona={icona(p.macroCategoria)}
              titolo={p.nome}
              sottotitolo={`Giorno ${p.giornoDelMese} · ${p.categoria} · ${p.conto}${conTrasferimento ? ' · con trasferimento' : ''}`}
              valore={formatEuro(p.importo)}
              onClick={() => setAperto(p.id)}
            />
          );
        })}
      </ListaVoci>
      <AggiungiVoce label="Aggiungi uscita ricorrente" onClick={() => setAperto('nuova')} />
      <ErroreEditor errore={error} />
    </div>
  );
}

function SchedaPresetUscita({ originale, chiudi }: { originale: PresetUscita | null; chiudi: () => void }) {
  const { presetUscite, presetTrasferimenti, macroCategorieUscite, conti, updateDatiBase } = useDatiBase();
  const [form, setForm] = useState({
    nome: originale?.nome ?? '',
    macroCategoria: originale?.macroCategoria ?? '',
    categoria: originale?.categoria ?? '',
    conto: originale?.conto ?? '',
    importo: originale ? String(originale.importo) : '',
    giornoDelMese: originale ? String(originale.giornoDelMese) : '',
    primaria: originale?.primaria ?? false
  });
  const aggiorna = (campi: Partial<typeof form>) => setForm(f => ({ ...f, ...campi }));

  const macro = macroCategorieUscite.find(m => m.nome === form.macroCategoria);
  const categorieDisponibili = macro?.categorie ?? [];
  const nome = form.nome.trim();
  const duplicato = presetUscite.some(p => p.nome === nome && p.id !== originale?.id);
  const giorno = Number(form.giornoDelMese);
  const valido = Boolean(nome) && !duplicato && form.macroCategoria && form.categoria && form.conto
    && Number(form.importo) > 0 && Number.isInteger(giorno) && giorno >= 1 && giorno <= 31;

  const salva = () => {
    if (!valido) return;
    const aggiornato: PresetUscita = {
      id: originale?.id ?? `preset-${Date.now()}`,
      nome,
      macroCategoria: form.macroCategoria,
      categoria: form.categoria,
      conto: form.conto,
      importo: Number(form.importo),
      giornoDelMese: giorno,
      primaria: form.primaria
    };
    const rinominato = originale && originale.nome !== nome;
    updateDatiBase({
      presetUscite: originale ? presetUscite.map(p => (p.id === originale.id ? aggiornato : p)) : [...presetUscite, aggiornato],
      // Il trasferimento collegato è legato al nome: lo seguiamo nel rinomina.
      ...(rinominato ? { presetTrasferimenti: presetTrasferimenti.map(t => (t.categoria === originale.nome ? { ...t, categoria: nome } : t)) } : {})
    });
    chiudi();
  };

  return (
    <div className="space-y-4">
      <Campo label="Nome" nota="Per il riconoscimento dai movimenti bancari, il nome deve comparire nella causale del bonifico (es. RATA BOLLO).">
        <input autoFocus={!originale} value={form.nome} onChange={e => aggiorna({ nome: e.target.value })} placeholder="Es. Rata Bollo" className={inputEditorClass} />
      </Campo>
      {duplicato && <p className="text-xs text-down font-semibold">Esiste già un preset con questo nome.</p>}

      <div className="grid grid-cols-2 gap-3">
        <Campo label="Macro categoria">
          <DropdownMenu
            icon={Grid}
            label="Macro categoria"
            accent="teal"
            fullWidth
            hideLabel
            placeholder="Scegli..."
            value={form.macroCategoria}
            displayValue={form.macroCategoria ? `${macro?.icon ?? ''} ${form.macroCategoria}` : ''}
            options={macroCategorieUscite.map(m => m.nome)}
            getOptionLabel={n => `${macroCategorieUscite.find(m => m.nome === n)?.icon ?? ''} ${n}`}
            onSelect={n => aggiorna({ macroCategoria: n, categoria: '' })}
          />
        </Campo>
        <Campo label="Categoria">
          {form.macroCategoria && categorieDisponibili.length === 0 ? (
            <input value={form.categoria} onChange={e => aggiorna({ categoria: e.target.value })} placeholder="Scrivi..." className={inputEditorClass} />
          ) : (
            <DropdownMenu
              icon={Tag}
              label="Categoria"
              accent="teal"
              fullWidth
              hideLabel
              placeholder="Scegli..."
              value={form.categoria}
              displayValue={form.categoria}
              options={categorieDisponibili}
              onSelect={c => aggiorna({ categoria: c })}
            />
          )}
        </Campo>
      </div>

      <Campo label="Conto">
        <DropdownMenu
          icon={CreditCard}
          label="Conto"
          accent="teal"
          fullWidth
          hideLabel
          placeholder="Scegli..."
          value={form.conto}
          displayValue={form.conto}
          options={conti}
          onSelect={c => aggiorna({ conto: c })}
        />
      </Campo>

      <div className="grid grid-cols-2 gap-3">
        <Campo label="Importo">
          <div className="relative">
            <input type="number" inputMode="decimal" step="0.01" min="0.01" value={form.importo} onChange={e => aggiorna({ importo: e.target.value })} className={`${inputEditorClass} pr-8`} />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-soft">€</span>
          </div>
        </Campo>
        <Campo label="Giorno del mese">
          <input type="number" inputMode="numeric" min="1" max="31" value={form.giornoDelMese} onChange={e => aggiorna({ giornoDelMese: e.target.value })} placeholder="1–31" className={inputEditorClass} />
        </Campo>
      </div>

      <Campo label="Tipologia">
        <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-canvas dark:bg-white/5" role="radiogroup">
          {[{ v: true, l: 'Primaria' }, { v: false, l: 'Secondaria' }].map(o => (
            <button
              key={o.l}
              type="button"
              role="radio"
              aria-checked={form.primaria === o.v}
              onClick={() => aggiorna({ primaria: o.v })}
              className={`py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${form.primaria === o.v ? 'bg-accent-strong text-white' : 'text-ink-soft hover:text-ink dark:hover:text-slate-200'}`}
            >
              {o.l}
            </button>
          ))}
        </div>
      </Campo>

      <AzioniScheda
        onSalva={salva}
        salvaAbilitato={Boolean(valido)}
        etichettaSalva={originale ? 'Salva' : 'Aggiungi preset'}
        onElimina={originale ? () => { updateDatiBase({ presetUscite: presetUscite.filter(p => p.id !== originale.id) }); chiudi(); } : undefined}
      />
    </div>
  );
}
