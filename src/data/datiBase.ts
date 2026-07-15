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
// in Impostazioni. Liste reali fornite da Federico (liste.txt). Le macro con
// categorie: [] sono "inserimento libero" (Istruzione, Regalo) — il form
// mostra un campo di testo invece del dropdown quando la lista è vuota.
export const MACRO_CATEGORIE_USCITE_SEED: MacroCategoriaUscita[] = [
  { nome: 'Automobile', icon: '🚘', categorie: ['Automobile', 'Assicurazione', 'Rifornimento', 'Manutenzione', 'Varie'] },
  { nome: 'Cibo', icon: '🍕', categorie: ['Bar', 'Ristorante', 'Spesa'] },
  { nome: 'Shopping', icon: '🛍️', categorie: ['vestiti', 'Beni Personali', 'Scarpe'] },
  { nome: 'Sport', icon: '🚴', categorie: ['Bici', 'Running', 'Svago'] },
  { nome: 'Svago', icon: '🎳', categorie: ['Cinema', 'Svago', 'Eventi', 'Bowling'] },
  { nome: 'Trasporti', icon: '🚌', categorie: ['TPL', 'Treni', 'Parcheggio', 'Bike Sharing', 'Autostrada', 'Benzina'] },
  { nome: 'Movimenti', icon: '📈', categorie: ['PAC', 'Azioni', 'ETF', 'Obbligazioni'] },
  { nome: 'Tasse', icon: '🏦', categorie: ['Bollo Auto', 'Bollo Titoli', 'Bollo Conto', 'Revisione', 'Conto Deposito', 'Tasse'] },
  { nome: 'Istruzione', icon: '📚', categorie: [] },
  { nome: 'Regalo', icon: '🎁', categorie: [] },
  { nome: 'Tecnologia', icon: '💻', categorie: ['telefono', 'giochi', 'Computer', 'Varie', 'Tecnologia'] },
  { nome: 'Vacanze', icon: '🏝️', categorie: ['Viaggio', 'Benzina', 'Bar', 'Ristorante', 'Spesa', 'TPL', 'Treni', 'Taxi', 'Alloggio', 'Bici'] },
  { nome: 'Abbonamenti', icon: '🔁', categorie: ['Bici', 'Spotify', 'Sito web', 'iCloud'] },
  { nome: 'Salute', icon: '🩺', categorie: ['medicine', 'Visita Medica', 'Parcheggio'] }
];

export const CATEGORIE_ENTRATE_SEED: string[] = ['Nonna Anna', 'Nonna Lina', 'Nonno Ago', 'Stipendio', 'Dividendi', 'Interessi'];

export const CONTI_SEED: string[] = ['Contanti', 'Unicredit', 'Unicredit prepagata', 'Trade Republic', 'Scalable', 'Santander', 'Santander Vincolato'];

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
