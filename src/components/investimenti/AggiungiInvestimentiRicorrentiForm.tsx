import React, { useState } from 'react';
import { CheckCircle2, Circle, PartyPopper, TrendingUp } from 'lucide-react';
import { useFinanceData } from '../../context/FinanceDataContext';
import { useDatiBase } from '../../hooks/useDatiBase';
import { BROKER_INVESTIMENTI, importoGiaInserito, meseLabelBroker, strumentiBroker } from '../../utils/investimentiRicorrenti';
import { MESI_ITALIANI } from '../../utils/date';
import { formatEuro } from '../../utils/format';

interface AggiungiInvestimentiRicorrentiFormProps {
  onSaved: () => void;
}

/**
 * Scrive in blocco i contributi mensili dei preset "Investimenti Ricorrenti"
 * nei tab "Scalable"/"Trade Republic", sulla riga del mese corrente (già
 * presente sul foglio) e nella colonna di ogni strumento. Come
 * AggiungiUsciteRicorrentiForm mostra solo i preset ancora mancanti questo
 * mese (cella vuota o a zero all'ultimo pull) e lascia deselezionare quelli
 * da saltare. Dopo la scrittura ri-scarica il foglio: le colonne calcolate
 * (rendimento, totale investito, ...) le aggiorna Sheets con le sue formule.
 */
export default function AggiungiInvestimentiRicorrentiForm({ onSaved }: AggiungiInvestimentiRicorrentiFormProps) {
  const { data, accessToken, spreadsheetId, refreshData } = useFinanceData();
  const { presetInvestimenti } = useDatiBase();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const oggi = new Date();
  const meseLabel = meseLabelBroker(oggi);

  const presetMancanti = presetInvestimenti.filter(p => importoGiaInserito(data, p.broker, p.strumento, meseLabel) === 0);
  // Nome del preset che non corrisponde a nessuna colonna strumento del tab
  // broker (es. refuso nel foglio di configurazione): la scrittura fallirebbe,
  // quindi la voce resta visibile ma non selezionabile. Se il pull non ha
  // ancora rilevato le colonne (lista vuota) non blocchiamo nulla: decide il
  // controllo in writeInvestimentiRicorrentiToSheet.
  const colonnaMancante = (broker: string, strumento: string) => {
    const noti = strumentiBroker(data, broker).map(n => n.trim().toLowerCase());
    return noti.length > 0 && !noti.includes(strumento.trim().toLowerCase());
  };
  const presetValidi = presetMancanti.filter(p => !colonnaMancante(p.broker, p.strumento));

  const [selezionati, setSelezionati] = useState<Set<string>>(() => new Set(presetValidi.map(p => p.id)));
  const toggleSelezionato = (id: string) => {
    setSelezionati(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const tutteSelezionate = presetValidi.length > 0 && presetValidi.every(p => selezionati.has(p.id));
  const toggleTutte = () => setSelezionati(tutteSelezionate ? new Set() : new Set(presetValidi.map(p => p.id)));

  const presetSelezionati = presetValidi.filter(p => selezionati.has(p.id));
  const totaleSelezionato = presetSelezionati.reduce((sum, p) => sum + p.importo, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (presetSelezionati.length === 0) return;
    if (!spreadsheetId) {
      setError('Nessun foglio Google collegato. Collega un foglio da Impostazioni.');
      return;
    }
    if (!accessToken) {
      setError('Autenticazione scaduta. Effettua di nuovo l\'accesso.');
      return;
    }
    setIsSaving(true);
    setError(null);
    // Un broker alla volta: se il secondo fallisce, il primo è comunque scritto
    // e al prossimo giro non compare più tra i mancanti (dopo il refresh).
    const scritti: string[] = [];
    try {
      const { writeInvestimentiRicorrentiToSheet } = await import('../../lib/sheetsService');
      for (const broker of BROKER_INVESTIMENTI) {
        const voci = presetSelezionati
          .filter(p => p.broker === broker)
          .map(p => ({ strumento: p.strumento, importo: p.importo }));
        if (voci.length === 0) continue;
        await writeInvestimentiRicorrentiToSheet(accessToken, spreadsheetId, broker, meseLabel, voci);
        scritti.push(broker);
      }
    } catch (err: any) {
      const giaScritti = scritti.length > 0 ? ` (${scritti.join(' e ')} già aggiornato)` : '';
      setError(`${err?.message || 'Errore durante la scrittura su Google Sheets.'}${giaScritti}`);
      setIsSaving(false);
      if (scritti.length > 0) refreshData();
      return;
    }
    await refreshData();
    setIsSaving(false);
    onSaved();
  };

  if (presetInvestimenti.length === 0) {
    return (
      <div className="flex flex-col items-center text-center gap-3 py-6">
        <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center">
          <TrendingUp className="w-6 h-6 text-sky-600 dark:text-sky-400" />
        </div>
        <p className="text-sm text-ink-soft max-w-xs">
          Non hai ancora configurato preset di investimenti ricorrenti. Puoi crearli da{' '}
          <span className="font-semibold text-ink dark:text-slate-200">Impostazioni → Preset Ricorrenti → Investimenti Ricorrenti</span>.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-ink dark:text-slate-200">{MESI_ITALIANI[oggi.getMonth()]} {oggi.getFullYear()}</p>
          <p className="text-2xs text-ink-soft uppercase tracking-wider font-bold">Contributi mancanti questo mese</p>
        </div>
        {presetValidi.length > 0 && (
          <button
            type="button"
            onClick={toggleTutte}
            className="text-xs font-bold text-sky-700 dark:text-sky-400 hover:underline cursor-pointer shrink-0"
          >
            {tutteSelezionate ? 'Deseleziona tutte' : 'Seleziona tutte'}
          </button>
        )}
      </div>

      {presetMancanti.length > 0 ? (
        <div className="space-y-4 max-h-[45vh] overflow-y-auto pr-0.5">
          {BROKER_INVESTIMENTI.map(broker => {
            const presetBroker = presetMancanti.filter(p => p.broker === broker);
            if (presetBroker.length === 0) return null;
            return (
              <div key={broker} className="space-y-2">
                <p className="text-2xs text-ink-soft uppercase tracking-wider font-bold">{broker}</p>
                {presetBroker.map(p => {
                  if (colonnaMancante(p.broker, p.strumento)) {
                    return (
                      <div key={p.id} className="flex items-center gap-3 pl-3 pr-3.5 py-2.5 rounded-2xl text-sm bg-rose-50 dark:bg-rose-500/10">
                        <Circle className="w-5 h-5 text-ink-soft/30 shrink-0" />
                        <span className="flex-1 min-w-0">
                          <span className="block font-bold text-ink dark:text-slate-200 truncate">{p.strumento}</span>
                          <span className="block text-2xs text-down">Colonna non trovata nel tab {broker}: correggi il nome nel foglio di configurazione</span>
                        </span>
                        <span className="font-bold text-ink-soft shrink-0 tabular-nums">{formatEuro(p.importo)}</span>
                      </div>
                    );
                  }
                  const selezionato = selezionati.has(p.id);
                  return (
                    <label
                      key={p.id}
                      className={`flex items-center gap-3 pl-3 pr-3.5 py-2.5 rounded-2xl text-sm cursor-pointer select-none transition-all ${
                        selezionato
                          ? 'bg-sky-50 dark:bg-sky-500/10'
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
                        ? <CheckCircle2 className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0" />
                        : <Circle className="w-5 h-5 text-ink-soft/50 shrink-0" />}
                      <span className="flex-1 min-w-0 font-bold text-ink dark:text-slate-200 truncate">{p.strumento}</span>
                      <span className="font-bold text-ink dark:text-slate-200 shrink-0 tabular-nums">{formatEuro(p.importo)}</span>
                    </label>
                  );
                })}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center text-center gap-2 py-6">
          <div className="w-12 h-12 rounded-2xl bg-up/10 flex items-center justify-center">
            <PartyPopper className="w-6 h-6 text-up" />
          </div>
          <p className="text-sm font-semibold text-ink dark:text-slate-200">Tutto in ordine!</p>
          <p className="text-xs text-ink-soft">Nessun investimento ricorrente mancante questo mese: sono già tutti inseriti.</p>
        </div>
      )}

      {error && <p className="text-xs text-down font-semibold">{error}</p>}

      {presetMancanti.length > 0 && (
        <div className="pt-1 space-y-3">
          <div className="flex items-center justify-between text-sm pt-3">
            <span className="text-ink-soft">
              {presetSelezionati.length} investiment{presetSelezionati.length === 1 ? 'o' : 'i'} selezionat{presetSelezionati.length === 1 ? 'o' : 'i'}
            </span>
            <span className="font-bold text-ink dark:text-slate-200 tabular-nums">{formatEuro(totaleSelezionato)}</span>
          </div>

          <button
            type="submit"
            disabled={presetSelezionati.length === 0 || isSaving}
            className="w-full py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSaving ? 'Salvataggio...' : `Aggiungi ${presetSelezionati.length} investiment${presetSelezionati.length === 1 ? 'o' : 'i'} ricorrent${presetSelezionati.length === 1 ? 'e' : 'i'}`}
          </button>
        </div>
      )}
    </form>
  );
}
