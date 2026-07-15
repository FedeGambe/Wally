/**
 * Re-export di comodo: Conti/Categorie/Preset vivono ora nel ciclo standard
 * di mockData.ts (pull/push su Google Sheet come Uscite/Entrate, vedi tab
 * "Conti"/"Categorie Entrate"/"Categorie Uscite"/"Preset Uscite Ricorrenti"
 * in src/config/sheetsConfig.tsx). Questo file esiste solo per non dover
 * aggiornare gli import esistenti (`from '../../data/datiBase'`) nei
 * componenti di Impostazioni — la fonte vera è src/data/mockData.ts.
 */
export type { MacroCategoriaUscita, PresetUscita } from './mockData';
export {
  CONTI,
  CATEGORIE_ENTRATE,
  MACRO_CATEGORIE_USCITE,
  PRESET_USCITE,
  iconPerMacroCategoria
} from './mockData';
export {
  MACRO_CATEGORIE_USCITE_SEED,
  CATEGORIE_ENTRATE_SEED,
  CONTI_SEED,
  PRESET_USCITE_SEED
} from '../config/datiBaseSeed';
