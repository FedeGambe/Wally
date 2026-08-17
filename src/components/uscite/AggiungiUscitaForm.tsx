import React, { useId, useState } from 'react';
import { Grid, Tag, CreditCard } from 'lucide-react';
import { useFinanceData } from '../../context/FinanceDataContext';
import { useDatiBase } from '../../hooks/useDatiBase';
import { useSaveAndPush } from '../../hooks/useSaveAndPush';
import { saveToLocalStorage, Transaction, Trasferimento } from '../../data/mockData';
import { iconPerMacroCategoria } from '../../data/datiBase';
import { MESI_ITALIANI } from '../../utils/date';
import { formatEuro } from '../../utils/format';
import DropdownMenu from '../DropdownMenu';

const toInputDate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

interface AggiungiUscitaFormProps {
  onSaved: () => void;
}

/**
 * Form "Aggiungi Uscita" — usato dal bottone dedicato in Uscite.tsx e dal
 * popup generale di Panoramica. Categorie/conto vengono da useDatiBase()
 * (Impostazioni → Dati Base); mese e icon si derivano da data/macroCategoria,
 * l'utente non li compila a mano. I dropdown usano DropdownMenu (lo stesso
 * componente dei filtri della pagina) invece del <select> nativo del browser,
 * il cui popup non è stilizzabile e in tema scuro risultava testo bianco su
 * sfondo bianco.
 */
export default function AggiungiUscitaForm({ onSaved }: AggiungiUscitaFormProps) {
  const dataId = useId();
  const descrizioneId = useId();
  const categoriaLiberaId = useId();
  const importoId = useId();
  const { data } = useFinanceData();
  const { macroCategorieUscite, conti, presetUscite, presetTrasferimenti } = useDatiBase();
  const { appendAndPush, isSaving, error } = useSaveAndPush();

  const [dataStr, setDataStr] = useState(() => toInputDate(new Date()));
  const [descrizione, setDescrizione] = useState('');
  const [macroCategoria, setMacroCategoria] = useState(macroCategorieUscite[0]?.nome || '');
  const [categoria, setCategoria] = useState('');
  const [conto, setConto] = useState(conti.includes('Trade Republic') ? 'Trade Republic' : conti[0] || '');
  const [importo, setImporto] = useState('');
  const [primaria, setPrimaria] = useState(true);
  const [presetSelezionatoId, setPresetSelezionatoId] = useState<string | null>(null);
  const [ancheTrasferimento, setAncheTrasferimento] = useState(false);

  // Applica un preset ricorrente (Impostazioni → Preset Uscite Ricorrenti):
  // precompila i campi, l'utente resta libero di modificarli prima di salvare.
  const applicaPreset = (presetId: string) => {
    const preset = presetUscite.find(p => p.id === presetId);
    if (!preset) return;
    setMacroCategoria(preset.macroCategoria);
    setCategoria(preset.categoria);
    setConto(preset.conto);
    setImporto(String(preset.importo));
    setDescrizione(preset.nome);
    setPrimaria(preset.primaria);
    setPresetSelezionatoId(presetId);
    setAncheTrasferimento(false);
  };

  const macroSelezionata = macroCategorieUscite.find(m => m.nome === macroCategoria);
  const categorieDisponibili = macroSelezionata?.categorie || [];
  const macroNomiList = macroCategorieUscite.map(m => m.nome);
  const macroIconByNome = Object.fromEntries(macroCategorieUscite.map(m => [m.nome, m.icon]));

  // Mese/anno "target" = quelli della data scelta nel form (di default oggi),
  // usati per capire quali preset ricorrenti mancano ancora in quel mese.
  const [targetAnnoStr, targetMeseStr] = dataStr.split('-');
  const targetMese = MESI_ITALIANI[parseInt(targetMeseStr, 10) - 1];
  const targetAnno = parseInt(targetAnnoStr, 10);
  const usciteDelMese = data.uscite.filter(t => t.mese === targetMese && t.data.split('/')[2] === targetAnnoStr);
  const presetMancanti = presetUscite.filter(p => !usciteDelMese.some(t => t.descrizione === p.nome));
  const hasTrasferimentoCollegato = (nomePreset: string) => presetTrasferimenti.some(pt => pt.categoria === nomePreset);
  const presetSelezionato = presetUscite.find(p => p.id === presetSelezionatoId);
  const selezionatoHaTrasferimento = presetSelezionato ? hasTrasferimentoCollegato(presetSelezionato.nome) : false;

  const handleMacroChange = (nome: string) => {
    setMacroCategoria(nome);
    setCategoria('');
  };

  const isValid = Boolean(descrizione.trim() && macroCategoria && categoria && conto && Number(importo) > 0 && dataStr);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    const [y, m, d] = dataStr.split('-');
    const nuovaTransazione: Transaction = {
      id: `manual-${Date.now()}`,
      data: `${d}/${m}/${y}`,
      mese: MESI_ITALIANI[parseInt(m, 10) - 1],
      descrizione: descrizione.trim(),
      macroCategoria,
      categoria,
      icon: iconPerMacroCategoria(macroCategoria),
      conto,
      importo: Number(importo),
      primaria
    };

    const presetTrasf = ancheTrasferimento && presetSelezionato
      ? presetTrasferimenti.find(pt => pt.categoria === presetSelezionato.nome)
      : undefined;

    const nuovoTrasferimento: Trasferimento | undefined = presetTrasf ? {
      id: `manual-${Date.now()}-t`,
      mese: targetMese,
      anno: targetAnno,
      contoOrdinante: presetTrasf.contoOrdinante,
      contoBeneficiario: presetTrasf.contoBeneficiario,
      importo: presetTrasf.importo
    } : undefined;

    const appends = [{ tabTitle: 'Uscite', record: nuovaTransazione as Record<string, any> }];
    if (nuovoTrasferimento) {
      appends.push({ tabTitle: 'Trasferimenti', record: nuovoTrasferimento as Record<string, any> });
    }

    const ok = await appendAndPush(() => {
      saveToLocalStorage({ uscite: [...data.uscite, nuovaTransazione] });
      if (nuovoTrasferimento) {
        saveToLocalStorage({ trasferimenti: [...data.trasferimenti, nuovoTrasferimento] });
      }
    }, appends);
    if (ok) onSaved();
  };

  const inputClass = "w-full px-3 py-2.5 rounded-xl text-sm border border-hairline dark:border-white/10 bg-canvas dark:bg-white/5 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-orange-500";
  // Il calendario nativo del browser disegna l'iconcina in nero fisso: su
  // sfondo scuro diventa quasi invisibile, la "invertiamo" via filtro CSS
  // (funziona su Chrome/Edge/Safari, gli unici che espongono questo pseudo-elemento).
  const dateInputClass = `${inputClass} dark:[color-scheme:dark] [&::-webkit-calendar-picker-indicator]:dark:invert`;
  const labelClass = "block text-[11px] font-bold text-ink-soft uppercase mb-1.5 tracking-wider";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {presetUscite.length > 0 && (
        <div>
          <label className={labelClass}>Uscite ricorrenti da inserire — {targetMese} {targetAnno}</label>
          {presetMancanti.length > 0 ? (
            <div className="flex flex-wrap gap-2 mb-2">
              {presetMancanti.map(p => {
                const collegato = hasTrasferimentoCollegato(p.nome);
                const selezionato = presetSelezionatoId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applicaPreset(p.id)}
                    className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      selezionato
                        ? 'bg-orange-700 text-white border-orange-700'
                        : 'bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-500/30 hover:bg-orange-100 dark:hover:bg-orange-500/20'
                    }`}
                  >
                    {collegato && (
                      <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5" title="Ha un trasferimento ricorrente collegato">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-500" />
                      </span>
                    )}
                    {p.nome} · {formatEuro(p.importo)}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-ink-soft mb-2">Nessuna uscita ricorrente ancora da inserire.</p>
          )}
          {presetSelezionato && selezionatoHaTrasferimento && (
            <label className="flex items-center gap-2 text-xs font-semibold text-ink-soft dark:text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={ancheTrasferimento}
                onChange={e => setAncheTrasferimento(e.target.checked)}
                className="cursor-pointer"
              />
              Aggiungi anche il trasferimento ricorrente collegato
            </label>
          )}
        </div>
      )}

      <div>
        <label htmlFor={dataId} className={labelClass}>Data</label>
        <input id={dataId} type="date" value={dataStr} onChange={e => setDataStr(e.target.value)} className={dateInputClass} required />
      </div>

      <div>
        <label htmlFor={descrizioneId} className={labelClass}>Descrizione</label>
        <input
          id={descrizioneId}
          type="text"
          value={descrizione}
          onChange={e => setDescrizione(e.target.value)}
          placeholder="Es. Spesa supermercato"
          className={inputClass}
          required
        />
      </div>

      <div>
        <label className={labelClass}>Macro Categoria</label>
        <DropdownMenu
          icon={Grid}
          label="Macro"
          accent="orange"
          fullWidth
          hideLabel
          value={macroCategoria}
          displayValue={macroCategoria ? `${macroIconByNome[macroCategoria] || ''} ${macroCategoria}` : ''}
          options={macroNomiList}
          getOptionLabel={nome => `${macroIconByNome[nome] || ''} ${nome}`}
          onSelect={handleMacroChange}
        />
      </div>

      <div>
        <label htmlFor={macroCategoria && categorieDisponibili.length === 0 ? categoriaLiberaId : undefined} className={labelClass}>Categoria</label>
        {macroCategoria && categorieDisponibili.length === 0 ? (
          // Macro a "inserimento libero" (es. Istruzione, Regalo): nessuna
          // lista predefinita, la categoria si scrive a mano.
          <input
            id={categoriaLiberaId}
            type="text"
            value={categoria}
            onChange={e => setCategoria(e.target.value)}
            placeholder="Scrivi la categoria..."
            className={inputClass}
            required
          />
        ) : (
          <DropdownMenu
            icon={Tag}
            label="Categoria"
            accent="orange"
            fullWidth
            hideLabel
            value={categoria}
            displayValue={categoria}
            options={categorieDisponibili}
            onSelect={setCategoria}
          />
        )}
      </div>

      <div>
        <label className={labelClass}>Conto Utilizzato</label>
        <DropdownMenu
          icon={CreditCard}
          label="Conto"
          accent="orange"
          fullWidth
          hideLabel
          value={conto}
          displayValue={conto}
          options={conti}
          onSelect={setConto}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={importoId} className={labelClass}>Importo (€)</label>
          <input
            id={importoId}
            type="number"
            step="0.01"
            min="0.01"
            value={importo}
            onChange={e => setImporto(e.target.value)}
            placeholder="0.00"
            className={inputClass}
            required
          />
        </div>
        <div>
          <span className={labelClass}>Tipologia</span>
          <div role="radiogroup" aria-label="Tipologia" className="flex bg-canvas dark:bg-white/5 p-1 rounded-xl gap-0.5 border border-hairline dark:border-white/10 h-[42px]">
            <button
              type="button"
              role="radio"
              aria-checked={primaria}
              onClick={() => setPrimaria(true)}
              className={`flex-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${primaria ? 'bg-orange-700 text-white' : 'text-ink-soft'}`}
            >
              Primaria
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={!primaria}
              onClick={() => setPrimaria(false)}
              className={`flex-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${!primaria ? 'bg-orange-400 text-white' : 'text-ink-soft'}`}
            >
              Secondaria
            </button>
          </div>
        </div>
      </div>

      {error && <p className="text-xs text-down font-semibold">{error}</p>}

      <button
        type="submit"
        disabled={!isValid || isSaving}
        className="w-full py-3 bg-orange-700 hover:bg-orange-800 text-white font-bold text-sm rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {isSaving ? 'Salvataggio...' : 'Aggiungi Uscita'}
      </button>
    </form>
  );
}
