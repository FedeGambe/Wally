/**
 * Lato app della sincronizzazione bancaria. Le funzioni su Vercel
 * (api/banca/*) scaricano i movimenti nella scheda "Movimenti Banca" del
 * foglio Finanza; da qui Wally li legge con il token dell'utente, segna nella
 * colonna "Stato" quelli registrati o scartati, legge i conti collegati da
 * "Banca Collegamenti" (foglio di configurazione) e chiama le funzioni per
 * collegare una banca o sincronizzare subito.
 *
 * Le due schede non sono in SHEETS_CONFIG: pull e push dell'app non le toccano.
 */
import type { MovimentoBanca } from '../utils/movimentiBanca';

const SCHEDA_MOVIMENTI = 'Movimenti Banca';
const SCHEDA_COLLEGAMENTI = 'Banca Collegamenti';

export const STATO_REGISTRATO = 'Registrato';
export const STATO_IGNORATO = 'Ignorato';

export interface RigaMovimentoBanca extends MovimentoBanca {
  riga: number;   // numero di riga nel foglio (1 = intestazioni)
  stato: string;  // '' = ancora da gestire
}

export interface CollegamentoBanca {
  banca: string;
  scadenza: string;   // YYYY-MM-DD
  iban: string;
  contoWally: string;
}

// Banche collegabili da Impostazioni (nome esatto in Enable Banking).
export const BANCHE_COLLEGABILI = [
  { banca: 'UniCredit', paese: 'IT' },
  { banca: 'Trade Republic', paese: 'IT' }
];

const leggiValori = async (accessToken: string, foglio: string, range: string): Promise<any[][]> => {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${foglio}/values/${encodeURIComponent(range)}?valueRenderOption=UNFORMATTED_VALUE`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store' });
  // 400 = la scheda non esiste ancora (nessuna sincronizzazione fatta): nessun dato.
  if (res.status === 400) return [];
  if (res.status === 401) throw new Error('UNAUTHENTICATED: La sessione di Google è scaduta.');
  if (!res.ok) throw new Error(`Lettura di "${range}" non riuscita (${res.status})`);
  return (await res.json()).values ?? [];
};

export const leggiMovimentiBanca = async (accessToken: string, spreadsheetId: string): Promise<RigaMovimentoBanca[]> => {
  const [, ...righe] = await leggiValori(accessToken, spreadsheetId, `'${SCHEDA_MOVIMENTI}'!A:F`);
  return righe
    .map((r, i) => ({
      riga: i + 2,
      id: String(r[0] ?? ''),
      data: String(r[1] ?? ''),
      conto: String(r[2] ?? ''),
      importo: Number(r[3]) || 0,
      descrizione: String(r[4] ?? ''),
      stato: String(r[5] ?? '')
    }))
    .filter(m => m.id);
};

export const segnaMovimentiBanca = async (
  accessToken: string,
  spreadsheetId: string,
  aggiornamenti: { riga: number; stato: string }[]
): Promise<void> => {
  if (aggiornamenti.length === 0) return;
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      valueInputOption: 'RAW',
      data: aggiornamenti.map(a => ({ range: `'${SCHEDA_MOVIMENTI}'!F${a.riga}`, values: [[a.stato]] }))
    })
  });
  if (!res.ok) throw new Error(`Aggiornamento di "${SCHEDA_MOVIMENTI}" non riuscito (${res.status})`);
};

export const leggiCollegamentiBanca = async (accessToken: string, configSpreadsheetId: string): Promise<CollegamentoBanca[]> => {
  const [intestazioni = [], ...righe] = await leggiValori(accessToken, configSpreadsheetId, `'${SCHEDA_COLLEGAMENTI}'`);
  const col = (nome: string) => intestazioni.indexOf(nome);
  return righe.map(r => ({
    banca: String(r[col('Banca')] ?? ''),
    scadenza: String(r[col('Scadenza')] ?? ''),
    iban: String(r[col('IBAN')] ?? ''),
    contoWally: String(r[col('Conto Wally')] ?? '')
  })).filter(c => c.banca);
};

const chiamaApiBanca = async (percorso: string, accessToken: string, body?: unknown): Promise<any> => {
  const res = await fetch(`/api/banca/${percorso}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {})
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.errore || `Richiesta a /api/banca/${percorso} non riuscita (${res.status})`);
  return json;
};

/** Avvia il collegamento (o rinnovo) e ritorna l'indirizzo della banca su cui mandare l'utente. */
export const avviaCollegamentoBanca = async (accessToken: string, banca: string, paese: string): Promise<string> =>
  (await chiamaApiBanca('collega', accessToken, { banca, paese })).url;

export const sincronizzaBancaOra = async (accessToken: string): Promise<{ aggiunti: number; scaduti: string[]; errori: string[] }> =>
  chiamaApiBanca('sincronizza', accessToken);

/** Giorni che mancano alla scadenza del consenso (negativo = già scaduto). */
export const giorniAllaScadenza = (scadenza: string, oggi = new Date()): number =>
  Math.ceil((Date.parse(scadenza) - Date.parse(oggi.toISOString().slice(0, 10))) / 86400_000);
