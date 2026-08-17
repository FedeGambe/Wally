import React, { useEffect, useId, useState } from 'react';
import { Calendar, Tag, CreditCard } from 'lucide-react';
import { useFinanceData } from '../../context/FinanceDataContext';
import { useDatiBase } from '../../hooks/useDatiBase';
import { useSaveAndPush } from '../../hooks/useSaveAndPush';
import { saveToLocalStorage, EntrataRecord } from '../../data/mockData';
import { MESI_ITALIANI } from '../../utils/date';
import DropdownMenu from '../DropdownMenu';
import ContantiBreakdown, { EMPTY_CONTANTI_COUNTS, contantiTotal, type ContantiCounts } from '../ContantiBreakdown';

interface AggiungiEntrataFormProps {
  onSaved: () => void;
}

/**
 * Form "Aggiungi Entrata" — niente campi data/descrizione (confermato non
 * servono, vedi docs/archive/PIANO-INSERIMENTO-DATI.md): solo mese (default corrente,
 * un flag per sceglierne uno diverso), anno derivato dal mese, categoria,
 * conto, importo. Stipendio e voci variabili restano inserimento manuale
 * puro, nessun preset applicato qui.
 */
export default function AggiungiEntrataForm({ onSaved }: AggiungiEntrataFormProps) {
  const importoId = useId();
  const { data } = useFinanceData();
  const { categorieEntrate, conti } = useDatiBase();
  const { appendAndPush, isSaving, error } = useSaveAndPush();

  const oggi = new Date();
  const [useMeseDiverso, setUseMeseDiverso] = useState(false);
  const [meseIdx, setMeseIdx] = useState(oggi.getMonth());
  const [anno, setAnno] = useState(oggi.getFullYear());
  const [categoria, setCategoria] = useState(categorieEntrate[0] || '');
  const [conto, setConto] = useState(conti.includes('Unicredit') ? 'Unicredit' : conti[0] || '');
  const [importo, setImporto] = useState('');
  const [contantiCounts, setContantiCounts] = useState<ContantiCounts>(EMPTY_CONTANTI_COUNTS);

  // L'Importo deve corrispondere alla composizione di banconote scelta: lo
  // ricalcoliamo automaticamente ogni volta che il conto è Contanti (anche
  // appena selezionato, per non lasciare visibile un importo digitato a mano
  // prima del cambio conto). Il campo Importo diventa di sola lettura in quel
  // caso (vedi JSX più sotto).
  useEffect(() => {
    if (conto === 'Contanti') {
      setImporto(String(contantiTotal(contantiCounts)));
    }
  }, [conto, contantiCounts]);

  const isValid = Boolean(categoria && conto && Number(importo) > 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    const nuovaEntrata: EntrataRecord = {
      id: `manual-${Date.now()}`,
      data: '',
      mese: MESI_ITALIANI[useMeseDiverso ? meseIdx : oggi.getMonth()],
      anno: useMeseDiverso ? anno : oggi.getFullYear(),
      descrizione: categoria,
      categoria,
      conto,
      importo: Number(importo)
    };

    // Entrata in Contanti: le banconote indicate entrano nel portafoglio (delta positivo).
    const contantiDelta = conto === 'Contanti'
      ? Object.fromEntries(Object.entries(contantiCounts).filter(([, n]) => n > 0))
      : undefined;

    const ok = await appendAndPush(() => {
      saveToLocalStorage({ entrate: [...data.entrate, nuovaEntrata] });
    }, [{ tabTitle: 'Entrate', record: nuovaEntrata }], contantiDelta && Object.keys(contantiDelta).length > 0 ? contantiDelta : undefined);
    if (ok) onSaved();
  };

  const inputClass = "w-full px-3 py-2.5 rounded-xl text-sm border border-hairline dark:border-white/10 bg-canvas dark:bg-white/5 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500";
  const labelClass = "block text-2xs font-bold text-ink-soft uppercase mb-1.5 tracking-wider";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className={labelClass}>Mese</label>
          <label className="flex items-center gap-1.5 text-2xs font-semibold text-ink-soft cursor-pointer select-none">
            <input type="checkbox" checked={useMeseDiverso} onChange={e => setUseMeseDiverso(e.target.checked)} className="cursor-pointer" />
            Mese diverso da quello corrente
          </label>
        </div>
        {useMeseDiverso ? (
          <div className="grid grid-cols-2 gap-3">
            <DropdownMenu
              icon={Calendar}
              label="Mese"
              accent="emerald"
              fullWidth
              hideLabel
              value={MESI_ITALIANI[meseIdx]}
              displayValue={MESI_ITALIANI[meseIdx]}
              options={MESI_ITALIANI}
              onSelect={m => setMeseIdx(MESI_ITALIANI.indexOf(m))}
            />
            <input type="number" value={anno} onChange={e => setAnno(Number(e.target.value))} aria-label="Anno" className={inputClass} />
          </div>
        ) : (
          <div className={`${inputClass} bg-canvas dark:bg-white/10 text-ink-soft dark:text-slate-400`}>
            {MESI_ITALIANI[oggi.getMonth()]} {oggi.getFullYear()}
          </div>
        )}
      </div>

      <div>
        <label className={labelClass}>Categoria</label>
        <DropdownMenu
          icon={Tag}
          label="Categoria"
          accent="emerald"
          fullWidth
          hideLabel
          value={categoria}
          displayValue={categoria}
          options={categorieEntrate}
          onSelect={setCategoria}
        />
      </div>

      <div>
        <label className={labelClass}>Conto</label>
        <DropdownMenu
          icon={CreditCard}
          label="Conto"
          accent="emerald"
          fullWidth
          hideLabel
          value={conto}
          displayValue={conto}
          options={conti}
          onSelect={setConto}
        />
      </div>

      {conto === 'Contanti' && (
        <ContantiBreakdown
          value={contantiCounts}
          onChange={setContantiCounts}
          hint="Banconote entrate nel portafoglio"
        />
      )}

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
          readOnly={conto === 'Contanti'}
          title={conto === 'Contanti' ? 'Calcolato automaticamente dalle banconote indicate sopra' : undefined}
          className={`${inputClass} ${conto === 'Contanti' ? 'bg-canvas dark:bg-white/10 text-ink-soft dark:text-slate-400 cursor-not-allowed' : ''}`}
          required
        />
      </div>

      {error && <p className="text-xs text-down font-semibold">{error}</p>}

      <button
        type="submit"
        disabled={!isValid || isSaving}
        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {isSaving ? 'Salvataggio...' : 'Aggiungi Entrata'}
      </button>
    </form>
  );
}
