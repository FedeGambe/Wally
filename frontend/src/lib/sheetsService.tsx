/**
 * PONTE tra l'app e il foglio Google (layer 1 dell'architettura dati).
 *
 * Qui ci sono solo le chiamate: tutto il lavoro (lettura, conversione dei
 * numeri, quali celle scrivere, controlli per non sovrascrivere formule o
 * valori) lo fa il backend Python, con il token Google dell'utente:
 *  - letture:   backend/routes/fogli.py      → backend/domain/lettura.py
 *  - scritture: backend/routes/scritture.py  → backend/domain/scrittura.py
 * La mappa delle schede (colonne, campi, formule) è in backend/models/foglio.py.
 *
 * Gli errori del backend arrivano come Error con il messaggio da mostrare
 * all'utente; quelli che iniziano per "UNAUTHENTICATED" fanno rinnovare il login.
 */
import { chiamaBackend } from './backend';

export interface SheetsData {
  uscite: any[];
  risparmio: any[];
  patrimonio: any[];
  analisiConsumi: any[];
  rendimentiInvestimenti: any[];
  entrate?: any[];
  trasferimenti?: any[];
  conti?: string[];
  categorieEntrate?: string[];
  macroCategorieUscite?: any[];
  presetUscite?: any[];
  presetTrasferimenti?: any[];
  presetInvestimenti?: any[];
  quotaFondoPensione?: number;
  soglie?: any[];
  capitaleImpegnato?: any[];
  risparmioHeaders?: string[];
  cruscottoInvestimenti?: any[];
  scalableInstruments?: any[];
  tradeRepublicInstruments?: any[];
  scalable?: any[];
  tradeRepublic?: any[];
  scalableFields?: string[];
  scalableHeaders?: string[];
  tradeRepublicFields?: string[];
  tradeRepublicHeaders?: string[];
  scalableColumnCategories?: Record<string, string>;
  tradeRepublicColumnCategories?: Record<string, string>;
  fondoPensione?: any[];
}

export interface DatiBase {
  conti?: string[];
  categorieEntrate?: string[];
  macroCategorieUscite?: any[];
  soglie?: any[];
  presetUscite?: any[];
  presetTrasferimenti?: any[];
  presetInvestimenti?: any[];
  quotaFondoPensione?: number;
}

const foglio = (id: string) => encodeURIComponent(id);

// --- Lettura ------------------------------------------------------------------

/** Tutte le schede del foglio principale, più il Cruscotto Investimenti calcolato. */
export const fetchSpreadsheetData = (accessToken: string, spreadsheetId: string): Promise<SheetsData> =>
  chiamaBackend<SheetsData>(`fogli/dati?foglio=${foglio(spreadsheetId)}`, accessToken);

/** Conti, categorie, soglie e preset dal foglio di configurazione (sf_config_spreadsheet_id). */
export const fetchDatiBaseFromConfigSheet = (accessToken: string, spreadsheetId: string): Promise<DatiBase> =>
  chiamaBackend<DatiBase>(`fogli/dati-base?foglio=${foglio(spreadsheetId)}`, accessToken);

// --- Scrittura ------------------------------------------------------------------

/**
 * Aggiunge UNA riga in fondo a una scheda (Uscite, Entrate, Trasferimenti,
 * Analisi consumi…), cella per cella. Le colonne-formula del foglio ("Mese" e
 * "Icon" di Uscite, "Anno" di Entrate, i calcoli dei Consumi) copiano la
 * formula della riga sopra invece di ricevere un valore.
 */
export const appendRowToSheet = async (
  accessToken: string,
  spreadsheetId: string,
  tabTitle: string,
  record: Record<string, any>
): Promise<void> => {
  await chiamaBackend('fogli/riga', accessToken, { metodo: 'POST', corpo: { foglio: spreadsheetId, scheda: tabTitle, record } });
};

// Tagli di banconota del tab "Portafoglio Raw" (riga 3, colonne B:F).
export const PORTAFOGLIO_DENOMINAZIONI = [5, 10, 20, 50, 100] as const;
export type PortafoglioDenominazione = typeof PORTAFOGLIO_DENOMINAZIONI[number];

/**
 * Contatori di banconote del Portafoglio Raw: positivi = aggiunte, negativi =
 * tolte. Se un contatore andrebbe sotto zero non si scrive niente.
 */
export const updatePortafoglioRawCounts = async (
  accessToken: string,
  spreadsheetId: string,
  deltas: Partial<Record<PortafoglioDenominazione, number>>
): Promise<void> => {
  await chiamaBackend('fogli/portafoglio', accessToken, { metodo: 'POST', corpo: { foglio: spreadsheetId, variazioni: deltas } });
};

/**
 * Importi mese × strumento su un tab broker ("Scalable" / "Trade Republic").
 * `somma` = false (contributi ricorrenti): se una cella è già piena non si
 * scrive niente. `somma` = true (investimento extra): l'importo si accoda a
 * quello presente, come a mano ("=40*2" → "=40*2+50").
 */
export const writeInvestimentiRicorrentiToSheet = async (
  accessToken: string,
  spreadsheetId: string,
  tabTitle: string,
  meseLabel: string, // es. "ottobre 2026", come appare in colonna A
  voci: { strumento: string; importo: number }[],
  somma = false
): Promise<void> => {
  if (voci.length === 0) return;
  await chiamaBackend('fogli/investimenti', accessToken, {
    metodo: 'POST',
    corpo: { foglio: spreadsheetId, scheda: tabTitle, mese: meseLabel, voci, somma }
  });
};

/**
 * Nuova colonna strumento su un tab broker, inserita dentro l'intervallo
 * sommato da "Importo investito Mensile", con nome, asset class e l'importo
 * del mese (`importo` null = solo la colonna).
 */
export const addStrumentoBrokerColumn = async (
  accessToken: string,
  spreadsheetId: string,
  tabTitle: string,
  nome: string,
  assetClass: string, // 'Azioni' | 'Obbligazioni' | 'Monetario' (riga 2)
  meseLabel: string,
  importo: number | null
): Promise<void> => {
  await chiamaBackend('fogli/strumento', accessToken, {
    metodo: 'POST',
    corpo: { foglio: spreadsheetId, scheda: tabTitle, nome, assetClass, mese: meseLabel, importo }
  });
};

/**
 * Verifica mensile dei broker: valori singoli (saldo, interessi, saveback,
 * rendimento cumulativo) in celle già esistenti e vuote, individuate da
 * intestazione + mese. Se anche una sola è piena non si scrive niente.
 */
export const writeVerificaMensileToSheet = async (
  accessToken: string,
  spreadsheetId: string,
  tabTitle: string,
  voci: { intestazione: string; meseLabel: string; valore: number }[]
): Promise<void> => {
  if (voci.length === 0) return;
  await chiamaBackend('fogli/verifica-mensile', accessToken, { metodo: 'POST', corpo: { foglio: spreadsheetId, scheda: tabTitle, voci } });
};

/**
 * Riscrive Conti, Categorie, Soglie e Preset sul foglio di configurazione
 * (quello da cui fetchDatiBaseFromConfigSheet li rilegge a ogni sync).
 */
export const pushDatiBaseToConfigSheet = async (accessToken: string, spreadsheetId: string, data: DatiBase): Promise<void> => {
  await chiamaBackend('fogli/dati-base', accessToken, { metodo: 'PUT', corpo: { foglio: spreadsheetId, dati: data } });
};

/** Crea un foglio Google nuovo con le schede dell'app e ne restituisce l'ID. */
export const createSpreadsheet = async (accessToken: string): Promise<string> =>
  (await chiamaBackend<{ spreadsheetId: string }>('fogli/nuovo', accessToken, { metodo: 'POST' })).spreadsheetId;

// --- Disattivato --------------------------------------------------------------

// Il push COMPLETO (riscrittura di intere schede del foglio principale) è
// spento da tempo: ha corrotto il foglio due volte e la causa non è mai stata
// trovata. Non esiste nel backend. I bottoni "Carica/Sincronizza" di
// SheetsModal mostrano questo messaggio; le scritture vere passano da
// appendRowToSheet e dalle altre funzioni qui sopra, che toccano solo celle
// precise.

export const pushSpreadsheetData = async (
  _accessToken: string,
  _spreadsheetId: string,
  _data: SheetsData,
  _tabTitles?: string[]
): Promise<void> => {
  throw new Error('Scrittura su Google Sheets temporaneamente disattivata (debug in corso). Nessun dato è stato inviato al foglio.');
};
