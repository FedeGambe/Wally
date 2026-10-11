import { useCallback, useState } from 'react';
import { useFinanceData } from '../context/FinanceDataContext';
import { saveToLocalStorage, MacroCategoriaUscita, PresetUscita, PresetTrasferimento, PresetInvestimento, Soglia } from '../data/mockData';

/**
 * Hook usato da Impostazioni (per editare conti/categorie/preset) e dai form
 * "Aggiungi Uscita/Entrata/Trasferimento" (per popolare i dropdown).
 *
 * Conti, Categorie Entrate/Uscite, Soglie e Preset Uscite/Trasferimenti/
 * Investimenti Ricorrenti sono tutti curati sul foglio di configurazione
 * ("finanza_data_config", sf_config_spreadsheet_id): editarli qui scrive lì
 * (pushDatiBaseToConfigSheet), non sul foglio principale — altrimenti il pull
 * automatico di finanza_data_config ad ogni sync (vedi
 * FinanceDataContext.refreshData) sovrascriverebbe la modifica al giro dopo.
 */
export function useDatiBase() {
  const { data, accessToken, bumpVersion } = useFinanceData();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateDatiBase = useCallback(async (update: {
    macroCategorieUscite?: MacroCategoriaUscita[];
    categorieEntrate?: string[];
    conti?: string[];
    presetUscite?: PresetUscita[];
    presetTrasferimenti?: PresetTrasferimento[];
    presetInvestimenti?: PresetInvestimento[];
    quotaFondoPensione?: number;
    soglie?: Soglia[];
  }) => {
    setIsSaving(true);
    setError(null);
    try {
      saveToLocalStorage(update);
      bumpVersion();

      const { conti, categorieEntrate, macroCategorieUscite, soglie, presetUscite, presetTrasferimenti, presetInvestimenti, quotaFondoPensione } = update;
      const hasConfigFields = conti !== undefined || categorieEntrate !== undefined ||
        macroCategorieUscite !== undefined || soglie !== undefined ||
        presetUscite !== undefined || presetTrasferimenti !== undefined ||
        presetInvestimenti !== undefined || quotaFondoPensione !== undefined;

      if (hasConfigFields) {
        const configId = localStorage.getItem('sf_config_spreadsheet_id');
        if (configId && accessToken) {
          const { pushDatiBaseToConfigSheet } = await import('../lib/sheetsService');
          await pushDatiBaseToConfigSheet(accessToken, configId, {
            conti, categorieEntrate, macroCategorieUscite, soglie, presetUscite, presetTrasferimenti, presetInvestimenti, quotaFondoPensione
          });
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Errore durante il salvataggio.');
    } finally {
      setIsSaving(false);
    }
  }, [accessToken, bumpVersion]);

  return {
    macroCategorieUscite: data.macroCategorieUscite,
    categorieEntrate: data.categorieEntrate,
    conti: data.conti,
    presetUscite: data.presetUscite,
    presetTrasferimenti: data.presetTrasferimenti,
    presetInvestimenti: data.presetInvestimenti,
    quotaFondoPensione: data.quotaFondoPensione,
    soglie: data.soglie,
    updateDatiBase,
    isSaving,
    error
  };
}
