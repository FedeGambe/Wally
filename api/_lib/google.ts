/**
 * Accesso ai fogli Google dal server con il service account `wally-sync`
 * (chiave JSON nella variabile GOOGLE_SA_KEY). I due fogli sono condivisi con
 * l'email del service account come Editor.
 */
import { createSign } from 'node:crypto';
import { env, chiavePem } from './enableBanking.js';

let tokenInCache: { valore: string; scade: number } | null = null;

const tokenGoogle = async (): Promise<string> => {
  if (tokenInCache && tokenInCache.scade > Date.now() + 60_000) return tokenInCache.valore;
  const chiave = JSON.parse(env('GOOGLE_SA_KEY'));
  const b64 = (s: string | Buffer) => Buffer.from(s).toString('base64url');
  const iat = Math.floor(Date.now() / 1000);
  const header = b64(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = b64(JSON.stringify({
    iss: chiave.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    iat,
    exp: iat + 3600
  }));
  const firma = createSign('RSA-SHA256').update(`${header}.${payload}`).sign(chiavePem(chiave.private_key));
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${header}.${payload}.${b64(firma)}` })
  });
  const json = await res.json();
  if (!json.access_token) throw new Error(`Token Google non ottenuto: ${JSON.stringify(json)}`);
  tokenInCache = { valore: json.access_token, scade: Date.now() + json.expires_in * 1000 };
  return json.access_token;
};

const sheets = async (metodo: 'GET' | 'POST', foglio: string, percorso: string, body?: unknown): Promise<any> => {
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${foglio}${percorso}`, {
    method: metodo,
    headers: { Authorization: `Bearer ${await tokenGoogle()}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  const testo = await res.text();
  if (!res.ok) throw new Error(`Sheets ${metodo} ${percorso} → ${res.status}: ${testo}`);
  return testo ? JSON.parse(testo) : {};
};

/** Crea la scheda con le intestazioni in riga 1, se non esiste già. */
export const assicuraScheda = async (foglio: string, titolo: string, intestazioni: string[]) => {
  const meta = await sheets('GET', foglio, '?fields=sheets.properties.title');
  if (meta.sheets.some((s: any) => s.properties.title === titolo)) return;
  await sheets('POST', foglio, ':batchUpdate', { requests: [{ addSheet: { properties: { title: titolo } } }] });
  await aggiungiRighe(foglio, titolo, [intestazioni]);
};

/** Righe della scheda come oggetti, con le intestazioni di riga 1 come chiavi. */
export const leggiScheda = async (foglio: string, titolo: string): Promise<Record<string, string>[]> => {
  const { values = [] } = await sheets('GET', foglio, `/values/${encodeURIComponent(`'${titolo}'`)}`);
  const [intestazioni = [], ...righe] = values as string[][];
  return righe.map(r => Object.fromEntries(intestazioni.map((h, i) => [h, r[i] ?? ''])));
};

// RAW: il testo resta testo (niente date o numeri reinterpretati dal locale
// del foglio). Gli importi li scriviamo come numeri JS, che restano numeri.
export const aggiungiRighe = async (foglio: string, titolo: string, righe: (string | number)[][]) => {
  if (righe.length === 0) return;
  await sheets('POST', foglio, `/values/${encodeURIComponent(`'${titolo}'!A1`)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, { values: righe });
};

/** Riscrive tutte le righe dati (dalla riga 2) di una scheda piccola. */
export const riscriviScheda = async (foglio: string, titolo: string, intestazioni: string[], righe: (string | number)[][]) => {
  await sheets('POST', foglio, `/values/${encodeURIComponent(`'${titolo}'`)}:clear`, {});
  await aggiungiRighe(foglio, titolo, [intestazioni, ...righe]);
};
