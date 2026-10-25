import React, { useEffect, useId, useState } from 'react';
import { Calendar, Tag, CreditCard, PiggyBank } from 'lucide-react';
import { useFinanceData } from '../../context/FinanceDataContext';
import { useDatiBase } from '../../hooks/useDatiBase';
import { useSaveAndPush } from '../../hooks/useSaveAndPush';
import { saveToLocalStorage, EntrataRecord } from '../../data/mockData';
import { MESI_ITALIANI } from '../../utils/date';
import DropdownMenu from '../DropdownMenu';
import AmountHero from '../AmountHero';
import ContantiBreakdown, { EMPTY_CONTANTI_COUNTS, contantiTotal, type ContantiCounts } from '../ContantiBreakdown';

interface AggiungiEntrataFormProps {
  onSaved: () => void;
  /** Valori di partenza (es. da un movimento bancario da confermare). */
  iniziale?: { meseIdx?: number; anno?: number; categoria?: string; conto?: string; importo?: number };
}

/**
 * Form "Aggiungi Entrata" — niente campi data/descrizione (confermato non
 * servono): solo mese (default corrente,
 * un flag per sceglierne uno diverso), anno derivato dal mese, categoria,
 * conto, importo. Stipendio e voci variabili restano inserimento manuale.
 * Con categoria "Stipendio" e una quota TFR configurata (Impostazioni →
 * Preset Ricorrenti → Quota Fondo Pensione) propone anche la riga nel tab
 * "Fondo Pensione": si scrive solo il TFR, il resto sono formule. Il TFR
 * versato con lo stipendio si riferisce al mese precedente (stipendio di
 * ottobre → riga di settembre).
 */
export default function AggiungiEntrataForm({ onSaved, iniziale }: AggiungiEntrataFormProps) {
  const importoId = useId();
  const { data, refreshData } = useFinanceData();
  const { categorieEntrate, conti, quotaFondoPensione } = useDatiBase();
  const { appendAndPush, isSaving, error } = useSaveAndPush();

  const oggi = new Date();
  const meseDiversoIniziale = iniziale?.meseIdx !== undefined
    && (iniziale.meseIdx !== oggi.getMonth() || (iniziale.anno ?? oggi.getFullYear()) !== oggi.getFullYear());
  const [useMeseDiverso, setUseMeseDiverso] = useState(meseDiversoIniziale);
  const [meseIdx, setMeseIdx] = useState(iniziale?.meseIdx ?? oggi.getMonth());
  const [anno, setAnno] = useState(iniziale?.anno ?? oggi.getFullYear());
  const [categoria, setCategoria] = useState(iniziale?.categoria || categorieEntrate[0] || '');
  const [conto, setConto] = useState(iniziale?.conto || (conti.includes('Unicredit') ? 'Unicredit' : conti[0] || ''));
  const [importo, setImporto] = useState(iniziale?.importo ? String(iniziale.importo) : '');
  const [contantiCounts, setContantiCounts] = useState<ContantiCounts>(EMPTY_CONTANTI_COUNTS);
  const [tfr, setTfr] = useState(quotaFondoPensione > 0 ? String(quotaFondoPensione) : '');

  const meseSceltoIdx = useMeseDiverso ? meseIdx : oggi.getMonth();
  const meseScelto = MESI_ITALIANI[meseSceltoIdx];
  const annoScelto = useMeseDiverso ? anno : oggi.getFullYear();
  // Il TFR arriva con lo stipendio ma è maturato nel mese prima.
  const meseFondo = MESI_ITALIANI[(meseSceltoIdx + 11) % 12].toLowerCase();
  const annoFondo = meseSceltoIdx === 0 ? annoScelto - 1 : annoScelto;
  const isStipendio = categoria.trim().toLowerCase() === 'stipendio';
  // Le righe del tab hanno solo il nome del mese (senza anno): se l'ultima è
  // già il mese del TFR, il fondo pensione di quel mese è già stato inserito.
  const ultimaRigaFondo = (data.fondoPensione || [])[(data.fondoPensione || []).length - 1];
  const fondoGiaInserito = String(ultimaRigaFondo?.mese || '').trim().toLowerCase() === meseFondo;
  const mostraFondo = isStipendio && quotaFondoPensione > 0;
  const [aggiungiFondo, setAggiungiFondo] = useState(true);
  const includiFondo = mostraFondo && !fondoGiaInserito && aggiungiFondo && Number(tfr) > 0;

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
      mese: meseScelto,
      anno: annoScelto,
      descrizione: categoria,
      categoria,
      conto,
      importo: Number(importo)
    };

    // Entrata in Contanti: le banconote indicate entrano nel portafoglio (delta positivo).
    const contantiDelta = conto === 'Contanti'
      ? Object.fromEntries(Object.entries(contantiCounts).filter(([, n]) => n > 0))
      : undefined;

    // Riga Fondo Pensione: `anno` non è una colonna del tab ma serve ad
    // backend per costruire la data del mese (`date_mese` in backend/models/foglio.py).
    const rigaFondo = { mese: meseFondo, anno: annoFondo, tfr: Number(tfr) };
    const appends = [{ tabTitle: 'Entrate', record: nuovaEntrata }];
    if (includiFondo) appends.push({ tabTitle: 'Fondo Pensione', record: rigaFondo as any });

    const ok = await appendAndPush(() => {
      saveToLocalStorage({
        entrate: [...data.entrate, nuovaEntrata],
        ...(includiFondo ? { fondoPensione: [...(data.fondoPensione || []), rigaFondo] } : {})
      });
    }, appends, contantiDelta && Object.keys(contantiDelta).length > 0 ? contantiDelta : undefined);
    if (ok) {
      onSaved();
      // Contribuzioni e totali della nuova riga li calcola il foglio: li
      // rileggiamo per non mostrare zeri fino alla prossima sincronizzazione.
      if (includiFondo) refreshData();
    }
  };

  const inputClass = "w-full px-3 py-2.5 rounded-xl text-sm bg-canvas dark:bg-white/5 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0";
  const labelClass = "block text-2xs font-bold text-ink-soft uppercase mb-1.5 tracking-wider";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <AmountHero
        id={importoId}
        label="Importo"
        value={importo}
        onChange={setImporto}
        readOnly={conto === 'Contanti'}
        readOnlyNote="Calcolato dalle banconote indicate qui sotto"
      />

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
              borderless
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
          borderless
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
          borderless
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

      {mostraFondo && (
        fondoGiaInserito ? (
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-canvas dark:bg-white/5 text-xs text-ink-soft">
            <PiggyBank className="w-5 h-5 text-up shrink-0" />
            Fondo pensione di {meseFondo} già inserito.
          </div>
        ) : (
          <div className={`p-3 rounded-2xl space-y-2.5 transition-all ${aggiungiFondo ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-canvas dark:bg-white/5'}`}>
            <label className="flex items-center gap-2 text-sm font-bold text-ink dark:text-slate-200 cursor-pointer select-none">
              <input type="checkbox" checked={aggiungiFondo} onChange={e => setAggiungiFondo(e.target.checked)} className="cursor-pointer" />
              <PiggyBank className="w-4 h-4 text-up" />
              Aggiungi anche il fondo pensione di {meseFondo}
            </label>
            {aggiungiFondo && (
              <div className="flex items-center gap-3">
                <label htmlFor={`${importoId}-tfr`} className="text-2xs font-bold text-ink-soft uppercase tracking-wider shrink-0">TFR di {meseFondo}</label>
                <input
                  id={`${importoId}-tfr`}
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={tfr}
                  onChange={e => setTfr(e.target.value)}
                  className={inputClass}
                />
              </div>
            )}
          </div>
        )
      )}

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
