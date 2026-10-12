import React, { useState } from 'react';
import { Landmark, LineChart, TrendingUp, Layers } from 'lucide-react';
import { useDatiBase } from '../../hooks/useDatiBase';
import { useFinanceData } from '../../context/FinanceDataContext';
import { formatEuro } from '../../utils/format';
import { ASSET_CLASS, BROKER_INVESTIMENTI, meseLabelBroker, strumentiBroker } from '../../utils/investimentiRicorrenti';
import type { PresetInvestimento } from '../../data/datiBase';
import DropdownMenu from '../DropdownMenu';
import { IntroEditor, ListaVoci, VoceRiga, AggiungiVoce, Campo, AzioniScheda, ErroreEditor, TitoloGruppo, inputEditorClass, useScheda, useVoceAperta } from './editorUI';

/**
 * Editor "Investimenti Ricorrenti" (popup di Impostazioni → Preset
 * Ricorrenti): importo MENSILE per ogni ETF dei tab "Scalable"/"Trade
 * Republic", raggruppati per broker con il totale. Usati da
 * AggiungiInvestimentiRicorrentiForm e dalla sincronizzazione bancaria (che
 * riconosce i PAC anche eseguiti in due metà, il 2 e il 16).
 */
export default function InvestimentiRicorrentiEditor() {
  const { presetInvestimenti, error } = useDatiBase();
  const [aperto, setAperto] = useVoceAperta<string>();
  const preset = presetInvestimenti.find(p => p.id === aperto);
  useScheda(aperto === null ? null : aperto === 'nuova' ? 'Nuovo investimento ricorrente' : preset?.strumento ?? '', () => setAperto(null));

  if (aperto !== null) {
    return <SchedaPresetInvestimento key={aperto} originale={preset ?? null} chiudi={() => setAperto(null)} />;
  }

  return (
    <div>
      <IntroEditor>
        Quanto investi ogni mese in ciascun ETF. Da "Aggiungi Dato → Investimenti Ricorrenti" gli
        importi vengono scritti nella riga del mese del broker.
      </IntroEditor>
      {presetInvestimenti.length === 0 && <ListaVoci vuota="Nessun investimento ricorrente ancora.">{[]}</ListaVoci>}
      {BROKER_INVESTIMENTI.map(broker => {
        const delBroker = presetInvestimenti.filter(p => p.broker === broker);
        if (delBroker.length === 0) return null;
        return (
          <div key={broker} className="mb-4">
            <TitoloGruppo>{broker} · {formatEuro(delBroker.reduce((sum, p) => sum + p.importo, 0))} al mese</TitoloGruppo>
            <ListaVoci>
              {delBroker.map(p => (
                <VoceRiga
                  key={p.id}
                  icona={<TrendingUp className="w-4 h-4 text-sky-600" />}
                  titolo={p.strumento}
                  valore={formatEuro(p.importo)}
                  onClick={() => setAperto(p.id)}
                />
              ))}
            </ListaVoci>
          </div>
        );
      })}
      <AggiungiVoce label="Aggiungi investimento ricorrente" onClick={() => setAperto('nuova')} />
      <ErroreEditor errore={error} />
    </div>
  );
}

function SchedaPresetInvestimento({ originale, chiudi }: { originale: PresetInvestimento | null; chiudi: () => void }) {
  const { data, accessToken, spreadsheetId, refreshData } = useFinanceData();
  const { presetInvestimenti, updateDatiBase } = useDatiBase();
  const [form, setForm] = useState({
    broker: originale?.broker ?? '',
    strumento: originale?.strumento ?? '',
    importo: originale ? String(originale.importo) : ''
  });
  // Strumento nuovo = non ha ancora la sua colonna nel tab del broker: la
  // creiamo al salvataggio (vuota, nessun investimento registrato).
  const [nuovo, setNuovo] = useState(false);
  const [assetClass, setAssetClass] = useState(ASSET_CLASS[0]);
  const [inSalvataggio, setInSalvataggio] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const aggiorna = (campi: Partial<typeof form>) => setForm(f => ({ ...f, ...campi }));

  const strumentiDisponibili = form.broker ? strumentiBroker(data, form.broker) : [];
  // Senza colonne lette dal foglio (pull non ancora fatto) non possiamo sapere
  // cosa esiste: il nome si scrive a mano come prima.
  const soloTesto = form.broker && strumentiDisponibili.length === 0;
  const strumento = form.strumento.trim();
  const duplicato = presetInvestimenti.some(p => p.broker === form.broker && p.strumento === strumento && p.id !== originale?.id);
  const colonnaEsistente = strumentiDisponibili.some(n => n.trim().toLowerCase() === strumento.toLowerCase());
  const valido = Boolean(form.broker && strumento && !duplicato && Number(form.importo) > 0 && !(nuovo && colonnaEsistente)) && !inSalvataggio;

  const salva = async () => {
    if (!valido) return;
    setErrore(null);
    if (nuovo) {
      if (!accessToken || !spreadsheetId) {
        setErrore('Serve il collegamento al foglio Google per creare la colonna dello strumento.');
        return;
      }
      setInSalvataggio(true);
      try {
        const { addStrumentoBrokerColumn } = await import('../../lib/sheetsService');
        await addStrumentoBrokerColumn(accessToken, spreadsheetId, form.broker, strumento, assetClass, meseLabelBroker(new Date()), null);
      } catch (e: any) {
        setErrore(e?.message || 'Creazione della colonna non riuscita.');
        setInSalvataggio(false);
        return;
      }
      // Rilegge il foglio: la colonna nuova compare tra gli strumenti del broker.
      refreshData();
    }
    const aggiornato: PresetInvestimento = { id: originale?.id ?? `preset-inv-${Date.now()}`, broker: form.broker, strumento, importo: Number(form.importo) };
    updateDatiBase({
      presetInvestimenti: originale ? presetInvestimenti.map(p => (p.id === originale.id ? aggiornato : p)) : [...presetInvestimenti, aggiornato]
    });
    chiudi();
  };

  return (
    <div className="space-y-4">
      <Campo label="Broker">
        <DropdownMenu
          icon={Landmark}
          label="Broker"
          accent="indigo"
          fullWidth
          hideLabel
          placeholder="Scegli..."
          value={form.broker}
          displayValue={form.broker}
          options={[...BROKER_INVESTIMENTI]}
          onSelect={broker => aggiorna({ broker, strumento: '' })}
        />
      </Campo>

      {form.broker && !soloTesto && (
        <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-canvas dark:bg-white/5" role="radiogroup">
          {[{ v: false, l: 'Strumento esistente' }, { v: true, l: 'Strumento nuovo' }].map(o => (
            <button
              key={o.l}
              type="button"
              role="radio"
              aria-checked={nuovo === o.v}
              onClick={() => { setNuovo(o.v); aggiorna({ strumento: '' }); }}
              className={`py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${nuovo === o.v ? 'bg-accent text-white' : 'text-ink-soft hover:text-ink dark:hover:text-slate-200'}`}
            >
              {o.l}
            </button>
          ))}
        </div>
      )}

      {form.broker && (nuovo ? (
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <Campo label="Nome dello strumento">
            <input autoFocus value={form.strumento} onChange={e => aggiorna({ strumento: e.target.value })} placeholder="Es. MSCI EM" className={inputEditorClass} />
          </Campo>
          <Campo label="Asset class">
            <DropdownMenu
              icon={Layers}
              label="Asset class"
              accent="indigo"
              fullWidth
              hideLabel
              value={assetClass}
              displayValue={assetClass}
              options={ASSET_CLASS}
              onSelect={setAssetClass}
            />
          </Campo>
        </div>
      ) : (
        <Campo label="Strumento">
          {soloTesto ? (
            <input value={form.strumento} onChange={e => aggiorna({ strumento: e.target.value })} placeholder="Nome colonna ETF" className={inputEditorClass} />
          ) : (
            <DropdownMenu
              icon={LineChart}
              label="Strumento"
              accent="indigo"
              fullWidth
              hideLabel
              placeholder="Scegli..."
              value={form.strumento}
              displayValue={form.strumento}
              options={strumentiDisponibili}
              onSelect={s => aggiorna({ strumento: s })}
            />
          )}
        </Campo>
      ))}
      {nuovo && colonnaEsistente && <p className="text-xs text-down font-semibold">Su {form.broker} esiste già una colonna con questo nome: sceglila tra gli strumenti esistenti.</p>}
      {nuovo && strumento && !colonnaEsistente && (
        <p className="text-2xs text-ink-soft leading-relaxed">
          Al salvataggio verrà aggiunta la colonna "{strumento}" ({assetClass}) nel tab {form.broker}, dentro il totale
          "Importo investito Mensile". Nessun investimento viene registrato.
        </p>
      )}
      {duplicato && <p className="text-xs text-down font-semibold">Questo strumento ha già un preset su {form.broker}.</p>}

      <Campo label="Importo mensile" nota="Se il broker lo esegue in due volte (es. 40 € il 2 e 40 € il 16), qui va il totale del mese: 80 €.">
        <div className="relative">
          <input type="number" inputMode="decimal" step="0.01" min="0.01" value={form.importo} onChange={e => aggiorna({ importo: e.target.value })} className={`${inputEditorClass} pr-8`} />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-soft">€</span>
        </div>
      </Campo>

      <ErroreEditor errore={errore} />
      <AzioniScheda
        onSalva={salva}
        salvaAbilitato={valido}
        etichettaSalva={inSalvataggio ? 'Creo la colonna...' : nuovo ? 'Crea strumento e salva' : originale ? 'Salva' : 'Aggiungi preset'}
        onElimina={originale ? () => { updateDatiBase({ presetInvestimenti: presetInvestimenti.filter(p => p.id !== originale.id) }); chiudi(); } : undefined}
      />
    </div>
  );
}
