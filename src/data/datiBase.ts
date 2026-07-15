/**
 * "DATI BASE" (layer 2, come mockData.ts): conti, categorie Uscite/Entrate e
 * preset ricorrenti usati nei form di inserimento manuale (Aggiungi Uscita/
 * Entrata/Trasferimento) e nei loro dropdown. A differenza dei dati
 * finanziari (TRANSACTIONS, ecc.) questi non arrivano da Google Sheets: i
 * valori di DEFAULT sono in src/config/datiBaseSeed.ts (usati solo finché
 * l'utente non modifica nulla), da quel momento sono editabili da
 * Impostazioni → Dati Base e persistiti in localStorage con lo stesso
 * pattern di mockData.ts (IIFE di lettura una tantum + `saveDatiBase()`
 * come unico punto di scrittura).
 */
import {
  MacroCategoriaUscita,
  PresetUscita,
  MACRO_CATEGORIE_USCITE_SEED,
  CATEGORIE_ENTRATE_SEED,
  CONTI_SEED,
  PRESET_USCITE_SEED
} from '../config/datiBaseSeed';

export type { MacroCategoriaUscita, PresetUscita };
export { MACRO_CATEGORIE_USCITE_SEED, CATEGORIE_ENTRATE_SEED, CONTI_SEED, PRESET_USCITE_SEED };

const loadJson = <T,>(key: string, fallback: T): T => {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : fallback;
  } catch {
    return fallback;
  }
};

export const MACRO_CATEGORIE_USCITE: MacroCategoriaUscita[] = loadJson('sf_macro_categorie_uscite', MACRO_CATEGORIE_USCITE_SEED);
export const CATEGORIE_ENTRATE: string[] = loadJson('sf_categorie_entrate', CATEGORIE_ENTRATE_SEED);
export const CONTI: string[] = loadJson('sf_conti_lista', CONTI_SEED);
export const PRESET_USCITE: PresetUscita[] = loadJson('sf_preset_uscite', PRESET_USCITE_SEED);

/** Ritrova l'icona della macro categoria di un'uscita, per popolarla in automatico al salvataggio. */
export function iconPerMacroCategoria(macroCategoria: string): string {
  return MACRO_CATEGORIE_USCITE.find(m => m.nome === macroCategoria)?.icon || '💸';
}

// UNICO PUNTO DI SCRITTURA per i dati base (stesso pattern di saveToLocalStorage
// in mockData.ts): persiste su localStorage e aggiorna l'array in-memory sul
// posto, così i moduli che l'hanno già importato vedono i nuovi dati.
export const saveDatiBase = (data: {
  macroCategorieUscite?: MacroCategoriaUscita[];
  categorieEntrate?: string[];
  conti?: string[];
  presetUscite?: PresetUscita[];
}) => {
  if (data.macroCategorieUscite) {
    localStorage.setItem('sf_macro_categorie_uscite', JSON.stringify(data.macroCategorieUscite));
    MACRO_CATEGORIE_USCITE.length = 0;
    MACRO_CATEGORIE_USCITE.push(...data.macroCategorieUscite);
  }
  if (data.categorieEntrate) {
    localStorage.setItem('sf_categorie_entrate', JSON.stringify(data.categorieEntrate));
    CATEGORIE_ENTRATE.length = 0;
    CATEGORIE_ENTRATE.push(...data.categorieEntrate);
  }
  if (data.conti) {
    localStorage.setItem('sf_conti_lista', JSON.stringify(data.conti));
    CONTI.length = 0;
    CONTI.push(...data.conti);
  }
  if (data.presetUscite) {
    localStorage.setItem('sf_preset_uscite', JSON.stringify(data.presetUscite));
    PRESET_USCITE.length = 0;
    PRESET_USCITE.push(...data.presetUscite);
  }
};
