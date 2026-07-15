import { useCallback } from 'react';
import { useFinanceData } from '../context/FinanceDataContext';
import { useSaveAndPush } from './useSaveAndPush';
import { saveToLocalStorage, MacroCategoriaUscita, PresetUscita } from '../data/mockData';

/**
 * Hook usato da Impostazioni (per editare conti/categorie/preset) e dai form
 * "Aggiungi Uscita/Entrata/Trasferimento" (per popolare i dropdown). Conti/
 * Categorie/Preset sono ormai parte del ciclo standard di sync (pull/push su
 * Google Sheet, tab "Conti"/"Categorie Entrate"/"Categorie Uscite"/"Preset
 * Uscite Ricorrenti" — vedi sheetsConfig.tsx), quindi si legge da
 * useFinanceData() come qualsiasi altro dato finanziario, e si scrive con lo
 * stesso saveAndPush (salva in locale, poi pusha) usato dai form di
 * inserimento — non serve più un pub/sub separato.
 */
export function useDatiBase() {
  const { data } = useFinanceData();
  const { saveAndPush, isSaving, error } = useSaveAndPush();

  const updateDatiBase = useCallback((update: {
    macroCategorieUscite?: MacroCategoriaUscita[];
    categorieEntrate?: string[];
    conti?: string[];
    presetUscite?: PresetUscita[];
  }) => {
    saveAndPush(() => {
      saveToLocalStorage(update);
    });
  }, [saveAndPush]);

  return {
    macroCategorieUscite: data.macroCategorieUscite,
    categorieEntrate: data.categorieEntrate,
    conti: data.conti,
    presetUscite: data.presetUscite,
    updateDatiBase,
    isSaving,
    error
  };
}
