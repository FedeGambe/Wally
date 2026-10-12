/**
 * Le due schede che la sincronizzazione bancaria aggiunge ai fogli.
 *
 * "Banca Collegamenti" (foglio di configurazione): un conto bancario per riga.
 * "Conto Wally" e "Sincronizza dal" si possono correggere a mano nel foglio e
 * sopravvivono al rinnovo del consenso (la riga si riconosce dall'IBAN).
 *
 * I due fogli sono gli stessi dell'app: gli ID arrivano dalle variabili
 * VITE_DEFAULT_SPREADSHEET_ID e VITE_DEFAULT_CONFIG_SPREADSHEET_ID, che su
 * Vercel sono visibili anche alle funzioni (il prefisso VITE_ serve solo a
 * Vite per esporle anche al browser).
 *
 * "Movimenti Banca" (foglio Finanza): i movimenti scaricati, uno per riga, mai
 * modificati dal server. "Stato" lo scrive Wally quando un movimento è stato
 * registrato o scartato; vuoto = ancora da gestire.
 */
export const COLLEGAMENTI = {
  titolo: 'Banca Collegamenti',
  intestazioni: ['Banca', 'Paese', 'Sessione', 'Scadenza', 'Account', 'IBAN', 'Conto Wally', 'Sincronizza dal']
};

export const MOVIMENTI = {
  titolo: 'Movimenti Banca',
  intestazioni: ['ID', 'Data', 'Conto', 'Importo', 'Descrizione', 'Stato', 'Scaricato il']
};

export interface Collegamento {
  banca: string;
  paese: string;
  sessione: string;
  scadenza: string;
  account: string;
  iban: string;
  contoWally: string;
  sincronizzaDal: string;
}

export const daRigaCollegamento = (r: Record<string, string>): Collegamento => ({
  banca: r['Banca'], paese: r['Paese'], sessione: r['Sessione'], scadenza: r['Scadenza'],
  account: r['Account'], iban: r['IBAN'], contoWally: r['Conto Wally'], sincronizzaDal: r['Sincronizza dal']
});

export const aRigaCollegamento = (c: Collegamento) =>
  [c.banca, c.paese, c.sessione, c.scadenza, c.account, c.iban, c.contoWally, c.sincronizzaDal];
