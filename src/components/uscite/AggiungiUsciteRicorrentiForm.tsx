import React, { useState } from 'react';
import { CheckCircle2, Circle, ArrowLeftRight, PartyPopper, Repeat } from 'lucide-react';
import { useFinanceData } from '../../context/FinanceDataContext';
import { useDatiBase } from '../../hooks/useDatiBase';
import { useSaveAndPush } from '../../hooks/useSaveAndPush';
import { saveToLocalStorage, Transaction, Trasferimento } from '../../data/mockData';
import { iconPerMacroCategoria } from '../../data/datiBase';
import { MESI_ITALIANI } from '../../utils/date';
import { formatEuro } from '../../utils/format';

interface AggiungiUsciteRicorrentiFormProps {
  onSaved: () => void;
}

/**
 * Aggiunge in blocco i preset di "Uscite Ricorrenti" ancora mancanti nel mese
 * corrente (ognuno datato sul proprio giorno del mese), inclusi i trasferimenti
 * collegati quando il preset ne ha uno (stessa regola di AggiungiUscitaForm:
 * match per nome preset == categoria del preset trasferimento). L'utente rivede
 * la lista e può deselezionare le voci che questo mese non vuole aggiungere.
 */
export default function AggiungiUsciteRicorrentiForm({ onSaved }: AggiungiUsciteRicorrentiFormProps) {
  const { data } = useFinanceData();
  const { presetUscite, presetTrasferimenti } = useDatiBase();
  const { appendAndPush, isSaving, error } = useSaveAndPush();

  const oggi = new Date();
  const targetMese = MESI_ITALIANI[oggi.getMonth()];
  const targetAnno = oggi.getFullYear();
  const targetAnnoStr = String(targetAnno);

  const usciteDelMese = data.uscite.filter(t => t.mese === targetMese && t.data.split('/')[2] === targetAnnoStr);
  const presetMancanti = presetUscite.filter(p => !usciteDelMese.some(t => t.descrizione === p.nome));
  const hasTrasferimentoCollegato = (nomePreset: string) => presetTrasferimenti.some(pt => pt.categoria === nomePreset);

  const [selezionati, setSelezionati] = useState<Set<string>>(() => new Set(presetMancanti.map(p => p.id)));
  const toggleSelezionato = (id: string) => {
    setSelezionati(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const tutteSelezionate = presetMancanti.length > 0 && presetMancanti.every(p => selezionati.has(p.id));
  const toggleTutte = () => setSelezionati(tutteSelezionate ? new Set() : new Set(presetMancanti.map(p => p.id)));

  const presetSelezionati = presetMancanti.filter(p => selezionati.has(p.id));
  const isValid = presetSelezionati.length > 0;
  const numeroTrasferimentiInclusi = presetSelezionati.filter(p => hasTrasferimentoCollegato(p.nome)).length;
  const totaleSelezionato = presetSelezionati.reduce((sum, p) => sum + p.importo, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    // Ogni preset si data col proprio "Giorno del Mese" nel mese/anno target,
    // non con la data odierna — clampato all'ultimo giorno reale del mese
    // (es. giorno 31 in un mese da 30 giorni).
    const meseIdx = oggi.getMonth();
    const giorniNelMeseTarget = new Date(targetAnno, meseIdx + 1, 0).getDate();
    const dataPerPreset = (giornoDelMese: number) => {
      const giorno = Math.min(Math.max(1, giornoDelMese || 1), giorniNelMeseTarget);
      return `${String(giorno).padStart(2, '0')}/${String(meseIdx + 1).padStart(2, '0')}/${targetAnno}`;
    };
    const nuoveUscite: Transaction[] = [];
    const nuoviTrasferimenti: Trasferimento[] = [];
    const appends: { tabTitle: string; record: Record<string, any> }[] = [];

    presetSelezionati.forEach(preset => {
      const nuovaTransazione: Transaction = {
        id: `manual-${Date.now()}-${preset.id}`,
        data: dataPerPreset(preset.giornoDelMese),
        mese: targetMese,
        descrizione: preset.nome,
        macroCategoria: preset.macroCategoria,
        categoria: preset.categoria,
        icon: iconPerMacroCategoria(preset.macroCategoria),
        conto: preset.conto,
        importo: preset.importo,
        primaria: preset.primaria
      };
      nuoveUscite.push(nuovaTransazione);
      appends.push({ tabTitle: 'Uscite', record: nuovaTransazione });

      const presetTrasf = presetTrasferimenti.find(pt => pt.categoria === preset.nome);
      if (presetTrasf) {
        const nuovoTrasferimento: Trasferimento = {
          id: `manual-${Date.now()}-${preset.id}-t`,
          mese: targetMese,
          anno: targetAnno,
          categoria: presetTrasf.categoria,
          contoOrdinante: presetTrasf.contoOrdinante,
          contoBeneficiario: presetTrasf.contoBeneficiario,
          importo: presetTrasf.importo
        };
        nuoviTrasferimenti.push(nuovoTrasferimento);
        appends.push({ tabTitle: 'Trasferimenti', record: nuovoTrasferimento });
      }
    });

    const ok = await appendAndPush(() => {
      saveToLocalStorage({
        uscite: [...data.uscite, ...nuoveUscite],
        trasferimenti: [...data.trasferimenti, ...nuoviTrasferimenti]
      });
    }, appends);
    if (ok) onSaved();
  };

  if (presetUscite.length === 0) {
    return (
      <div className="flex flex-col items-center text-center gap-3 py-6">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
          <Repeat className="w-6 h-6 text-amber-600 dark:text-amber-400" />
        </div>
        <p className="text-sm text-ink-soft max-w-xs">
          Non hai ancora configurato preset di uscite ricorrenti. Puoi crearli da{' '}
          <span className="font-semibold text-ink dark:text-slate-200">Impostazioni → Dati Base → Uscite Ricorrenti</span>.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-ink dark:text-slate-200">{targetMese} {targetAnno}</p>
          <p className="text-2xs text-ink-soft uppercase tracking-wider font-bold">Preset mancanti questo mese</p>
        </div>
        {presetMancanti.length > 0 && (
          <button
            type="button"
            onClick={toggleTutte}
            className="text-xs font-bold text-amber-700 dark:text-amber-400 hover:underline cursor-pointer shrink-0"
          >
            {tutteSelezionate ? 'Deseleziona tutte' : 'Seleziona tutte'}
          </button>
        )}
      </div>

      {presetMancanti.length > 0 ? (
        <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-0.5">
          {presetMancanti.map(p => {
            const collegato = hasTrasferimentoCollegato(p.nome);
            const selezionato = selezionati.has(p.id);
            return (
              <label
                key={p.id}
                className={`flex items-center gap-3 pl-3 pr-3.5 py-2.5 rounded-2xl text-sm cursor-pointer select-none transition-all ${
                  selezionato
                    ? 'bg-amber-50 dark:bg-amber-500/10'
                    : 'bg-canvas dark:bg-white/5 opacity-55 hover:opacity-80'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selezionato}
                  onChange={() => toggleSelezionato(p.id)}
                  className="sr-only"
                />
                {selezionato
                  ? <CheckCircle2 className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                  : <Circle className="w-5 h-5 text-ink-soft/50 shrink-0" />}

                <span className="w-9 h-9 rounded-xl bg-white dark:bg-white/10 flex items-center justify-center text-base shrink-0">
                  {iconPerMacroCategoria(p.macroCategoria)}
                </span>

                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-1.5">
                    <span className="font-bold text-ink dark:text-slate-200 truncate">{p.nome}</span>
                    {collegato && (
                      <span
                        className="inline-flex items-center gap-1 shrink-0 px-1.5 py-0.5 rounded-full text-3xs font-bold text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-500/10"
                        title="Ha un trasferimento ricorrente collegato"
                      >
                        <ArrowLeftRight className="w-2.5 h-2.5" />
                        trasferimento
                      </span>
                    )}
                  </span>
                  <span className="block text-2xs text-ink-soft truncate">
                    {p.categoria} · {p.conto} · giorno {p.giornoDelMese}
                  </span>
                </span>

                <span className="font-bold text-ink dark:text-slate-200 shrink-0 tabular-nums">{formatEuro(p.importo)}</span>
              </label>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center text-center gap-2 py-6">
          <div className="w-12 h-12 rounded-2xl bg-up/10 flex items-center justify-center">
            <PartyPopper className="w-6 h-6 text-up" />
          </div>
          <p className="text-sm font-semibold text-ink dark:text-slate-200">Tutto in ordine!</p>
          <p className="text-xs text-ink-soft">Nessuna uscita ricorrente mancante questo mese: sono già tutte inserite.</p>
        </div>
      )}

      {error && <p className="text-xs text-down font-semibold">{error}</p>}

      {presetMancanti.length > 0 && (
        <div className="pt-1 space-y-3">
          <div className="flex items-center justify-between text-sm pt-3">
            <span className="text-ink-soft">
              {presetSelezionati.length} uscit{presetSelezionati.length === 1 ? 'a' : 'e'} selezionat{presetSelezionati.length === 1 ? 'a' : 'e'}
              {numeroTrasferimentiInclusi > 0 && ` · ${numeroTrasferimentiInclusi} trasferiment${numeroTrasferimentiInclusi === 1 ? 'o' : 'i'}`}
            </span>
            <span className="font-bold text-ink dark:text-slate-200 tabular-nums">{formatEuro(totaleSelezionato)}</span>
          </div>

          <button
            type="submit"
            disabled={!isValid || isSaving}
            className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSaving ? 'Salvataggio...' : `Aggiungi ${presetSelezionati.length} uscit${presetSelezionati.length === 1 ? 'a' : 'e'} ricorrent${presetSelezionati.length === 1 ? 'e' : 'i'}`}
          </button>
        </div>
      )}
    </form>
  );
}
