/**
 * Valori di DEFAULT per conti/categorie/preset (Impostazioni → Dati Base),
 * usati solo la prima volta che l'app parte (prima che l'utente modifichi
 * qualcosa da Impostazioni). Da qui in poi i dati veri vivono in localStorage
 * — vedi src/data/datiBase.ts, che legge questo seed come fallback iniziale
 * e possiede l'unico punto di scrittura (saveDatiBase).
 *
 * Per cambiare conti/categorie di default si modifica SOLO questo file.
 */

export interface MacroCategoriaUscita {
  nome: string;
  icon: string;
  categorie: string[];
}

// Liste reali fornite da Federico (liste.txt). Le macro con categorie: []
// sono "inserimento libero" (Istruzione, Regalo) — il form Aggiungi Uscita
// mostra un campo di testo invece del dropdown quando la lista è vuota.
export const MACRO_CATEGORIE_USCITE_SEED: MacroCategoriaUscita[] = [
  { nome: 'Automobile', icon: '🚘', categorie: ['Automobile', 'Assicurazione', 'Rifornimento', 'Manutenzione', 'Varie'] },
  { nome: 'Cibo', icon: '🍕', categorie: ['Bar', 'Ristorante', 'Spesa'] },
  { nome: 'Shopping', icon: '🛍️', categorie: ['Vestiti', 'Beni Personali', 'Scarpe'] },
  { nome: 'Sport', icon: '🚴', categorie: ['Bici', 'Running', 'Svago'] },
  { nome: 'Svago', icon: '🎳', categorie: ['Cinema', 'Svago', 'Eventi', 'Bowling'] },
  { nome: 'Trasporti', icon: '🚌', categorie: ['TPL', 'Treni', 'Parcheggio', 'Bike Sharing', 'Autostrada', 'Benzina'] },
  { nome: 'Movimenti', icon: '📈', categorie: ['PAC', 'Azioni', 'ETF', 'Obbligazioni'] },
  { nome: 'Tasse', icon: '🏦', categorie: ['Bollo Auto', 'Bollo Titoli', 'Bollo Conto', 'Revisione', 'Conto Deposito', 'Tasse'] },
  { nome: 'Istruzione', icon: '📚', categorie: [] },
  { nome: 'Regalo', icon: '🎁', categorie: [] },
  { nome: 'Tecnologia', icon: '💻', categorie: ['Telefono', 'Giochi', 'Computer', 'Varie', 'Tecnologia'] },
  { nome: 'Vacanze', icon: '🏝️', categorie: ['Viaggio', 'Benzina', 'Bar', 'Ristorante', 'Spesa', 'TPL', 'Treni', 'Taxi', 'Alloggio', 'Bici'] },
  { nome: 'Abbonamenti', icon: '🔁', categorie: ['Bici', 'Spotify', 'Sito web', 'iCloud'] },
  { nome: 'Salute', icon: '🩺', categorie: ['Medicine', 'Visita Medica', 'Parcheggio'] }
];

export const CATEGORIE_ENTRATE_SEED: string[] = ['Nonna Anna', 'Nonna Lina', 'Nonno Ago', 'Stipendio', 'Dividendi', 'Interessi'];

export const CONTI_SEED: string[] = ['Contanti', 'Unicredit', 'Unicredit prepagata', 'Trade Republic', 'Scalable', 'Santander', 'Santander Vincolato'];

/**
 * Preset per uscite ricorrenti quasi identiche ogni mese (Fase 2 del piano:
 * es. bonifici verso conti di Accantonamento). Precompila il form "Aggiungi
 * Uscita" — l'utente sceglie il preset, i campi si riempiono da soli, conferma
 * o modifica prima di salvare. Nessun inserimento automatico: zero rischio di
 * duplicati/dimenticanze. Seed vuoto di proposito: sono i preset dell'utente,
 * nessun default sensato da suggerire.
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

/**
 * Preset per trasferimenti ricorrenti collegati a un'uscita ricorrente (es.
 * bonifico verso un conto di accantonamento quando si paga una rata). `categoria`
 * deve combaciare col `nome` di un PresetUscita per far scattare il flag "aggiungi
 * anche il trasferimento" e il pallino lampeggiante nel form Aggiungi Uscita.
 * Seed vuoto di proposito, stesso motivo di PRESET_USCITE_SEED.
 */
export interface PresetTrasferimento {
  id: string;
  categoria: string;
  contoOrdinante: string;
  contoBeneficiario: string;
  importo: number;
}

export const PRESET_TRASFERIMENTI_SEED: PresetTrasferimento[] = [];

/**
 * Soglie percentuali target per l'allocazione del reddito (quanto % dovrebbe
 * andare a spese primarie/secondarie/investimenti/risparmio). Seed allineato
 * ai default di src/config/targets.tsx — se l'utente collega un foglio di
 * configurazione con un tab "Soglie" proprio, quei valori sostituiscono
 * questo seed (vedi bottone "Importa da foglio di configurazione" in
 * DatiBaseSettings).
 */
export interface Soglia {
  categoria: string;
  percentuale: number; // 0-100
}

export const SOGLIE_SEED: Soglia[] = [
  { categoria: 'Spese Primarie', percentuale: 35 },
  { categoria: 'Spese Secondarie', percentuale: 15 },
  { categoria: 'Risparmio', percentuale: 25 },
  { categoria: 'Investimenti', percentuale: 25 }
];
