/**
 * "DATI BASE" (layer 2, come mockData.ts): conti, categorie Uscite/Entrate
 * usati nei form di inserimento manuale (Aggiungi Uscita/Entrata/Trasferimento)
 * e nei loro dropdown. A differenza dei dati finanziari (TRANSACTIONS, ecc.)
 * questi non arrivano da Google Sheets: nascono da un seed di default qui
 * sotto, e da quel momento sono editabili dall'utente in Impostazioni →
 * Dati Base, persistiti in localStorage con lo stesso pattern di mockData.ts
 * (IIFE di lettura una tantum + `saveDatiBase()` come unico punto di scrittura).
 */

export interface MacroCategoriaUscita {
  nome: string;
  icon: string;
  categorie: string[];
}

// Seed di default: usato solo se l'utente non ha ancora personalizzato nulla
// in Impostazioni. Ricalca le categorie già viste nei dati demo dell'app.
export const MACRO_CATEGORIE_USCITE_SEED: MacroCategoriaUscita[] = [
  { nome: 'Cibo', icon: '🍕', categorie: ['Spesa', 'Ristorante'] },
  { nome: 'Automobile', icon: '🚘', categorie: ['Rifornimento', 'Rata', 'Manutenzione', 'Bollo/Assicurazione'] },
  { nome: 'Casa', icon: '🏠', categorie: ['Affitto/Mutuo', 'Bollette', 'Manutenzione'] },
  { nome: 'Salute', icon: '🩺', categorie: ['Visita Medica', 'Medicine'] },
  { nome: 'Sport', icon: '🚴', categorie: ['Abbonamento', 'Attrezzatura'] },
  { nome: 'Abbonamenti', icon: '🔁', categorie: ['Streaming', 'Software/App'] },
  { nome: 'Shopping', icon: '🛍️', categorie: ['Beni Personali', 'Regalo'] },
  { nome: 'Svago', icon: '🕺', categorie: ['Cinema', 'Uscite'] },
  { nome: 'Vacanze', icon: '🏝️', categorie: ['Viaggio'] },
  { nome: 'Tasse', icon: '🏦', categorie: ['Bollo', 'Imposte'] },
  { nome: 'Altro', icon: '💸', categorie: ['Varie'] }
];

export const CATEGORIE_ENTRATE_SEED: string[] = ['Stipendio', 'Bonus', 'Rimborso', 'Altro'];

export const CONTI_SEED: string[] = ['Conto Corrente', 'Conto Deposito', 'Carta Prepagata', 'Contanti'];

/**
 * Preset per uscite ricorrenti quasi identiche ogni mese (Fase 2 del piano:
 * es. bonifici verso conti di Accantonamento). Precompila il form "Aggiungi
 * Uscita" — l'utente sceglie il preset, i campi si riempiono da soli, conferma
 * o modifica prima di salvare. Nessun inserimento automatico: zero rischio di
 * duplicati/dimenticanze.
 */
export interface PresetUscita {
  id: string;
  nome: string;
  macroCategoria: string;
  categoria: string;
  conto: string;
  importo: number;
  descrizione: string;
  primaria: boolean;
}

export const PRESET_USCITE_SEED: PresetUscita[] = [];

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
