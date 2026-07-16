import { useCallback, useState } from 'react';
import { useFinanceData } from '../context/FinanceDataContext';
import { saveToLocalStorage, MacroCategoriaUscita, PresetUscita, PresetTrasferimento, Soglia } from '../data/mockData';

/**
 * Hook usato da Impostazioni (per editare conti/categorie/preset) e dai form
 * "Aggiungi Uscita/Entrata/Trasferimento" (per popolare i dropdown).
 *
 * Conti, Categorie Entrate/Uscite e Soglie sono curati sul foglio di
 * configurazione ("finanza_data_config", sf_config_spreadsheet_id): editarli
 * qui scrive lì (pushDatiBaseToConfigSheet), non sul foglio principale —
 * altrimenti il pull automatico di finanza_data_config ad ogni sync (vedi
 * FinanceDataContext.refreshData) sovrascriverebbe la modifica al giro dopo.
 * Preset Uscite/Trasferimenti Ricorrenti restano invece sul ciclo standard
 * (foglio principale, come qualsiasi altro dato finanza).
 */
export function useDatiBase() {
  const { data, accessToken, bumpVersion, pushToSheet } = useFinanceData();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateDatiBase = useCallback(async (update: {
    macroCategorieUscite?: MacroCategoriaUscita[];
    categorieEntrate?: string[];
    conti?: string[];
    presetUscite?: PresetUscita[];
    presetTrasferimenti?: PresetTrasferimento[];
    soglie?: Soglia[];
  }) => {
    setIsSaving(true);
    setError(null);
    try {
      saveToLocalStorage(update);
      bumpVersion();

      const { conti, categorieEntrate, macroCategorieUscite, soglie, presetUscite, presetTrasferimenti } = update;
      const hasConfigFields = conti !== undefined || categorieEntrate !== undefined ||
        macroCategorieUscite !== undefined || soglie !== undefined;
      const hasMainFields = presetUscite !== undefined || presetTrasferimenti !== undefined;

      if (hasConfigFields) {
        const configId = localStorage.getItem('sf_config_spreadsheet_id');
        if (configId && accessToken) {
          const { pushDatiBaseToConfigSheet } = await import('../lib/sheetsService');
          await pushDatiBaseToConfigSheet(accessToken, configId, { conti, categorieEntrate, macroCategorieUscite, soglie });
        }
      }

      if (hasMainFields) {
        await pushToSheet();
      }
    } catch (err: any) {
      setError(err?.message || 'Errore durante il salvataggio.');
    } finally {
      setIsSaving(false);
    }
  }, [accessToken, bumpVersion, pushToSheet]);

  return {
    macroCategorieUscite: data.macroCategorieUscite,
    categorieEntrate: data.categorieEntrate,
    conti: data.conti,
    presetUscite: data.presetUscite,
    presetTrasferimenti: data.presetTrasferimenti,
    soglie: data.soglie,
    updateDatiBase,
    isSaving,
    error
  };
}
