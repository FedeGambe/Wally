/**
 * Chi può chiamare le funzioni /api/banca/*:
 *  - Wally, con il token Google dell'utente loggato: è autorizzato chi riesce
 *    ad aprire il foglio Finanza con quel token (cioè il suo proprietario),
 *    senza dover tenere da qualche parte un elenco di email ammesse;
 *  - il cron di Vercel, che manda "Authorization: Bearer <CRON_SECRET>".
 * CRON_SECRET firma anche lo `state` del collegamento banca, così il ritorno
 * dalla banca (/api/banca/callback) accetta solo collegamenti partiti da Wally.
 */
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { env } from './enableBanking.js';

const bearer = (request: Request) => request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';

const uguali = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export const daCron = (request: Request) => uguali(bearer(request), env('CRON_SECRET'));

export const daProprietario = async (request: Request): Promise<boolean> => {
  const token = bearer(request);
  if (!token) return false;
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${env('VITE_DEFAULT_SPREADSHEET_ID')}?fields=spreadsheetId`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.ok;
};

export const nonAutorizzato = () => Response.json({ errore: 'Non autorizzato' }, { status: 401 });

const firma = (testo: string) => createHmac('sha256', env('CRON_SECRET')).update(testo).digest('base64url');

/** state = banca|paese|scadenza|nonce|firma: valido 1 ora. */
export const creaState = (banca: string, paese: string): string => {
  const corpo = [banca, paese, Date.now() + 3600_000, randomUUID()].map(v => encodeURIComponent(String(v))).join('|');
  return `${corpo}|${firma(corpo)}`;
};

export const leggiState = (state: string): { banca: string; paese: string } | null => {
  const i = state.lastIndexOf('|');
  const corpo = state.slice(0, i);
  if (i < 0 || !uguali(state.slice(i + 1), firma(corpo))) return null;
  const [banca, paese, scade] = corpo.split('|').map(decodeURIComponent);
  return Number(scade) > Date.now() ? { banca, paese } : null;
};
