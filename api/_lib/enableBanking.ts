/**
 * Client minimo di Enable Banking (open banking PSD2) per le funzioni Vercel.
 * Stessa logica di scripts/banca.ts, ma la chiave privata arriva dalla
 * variabile d'ambiente EB_PRIVATE_KEY (contenuto del .pem) invece che da file.
 */
import { createSign } from 'node:crypto';

const API = 'https://api.enablebanking.com';

export const env = (nome: string): string => {
  const v = process.env[nome];
  if (!v) throw new Error(`Variabile d'ambiente mancante: ${nome}`);
  return v;
};

// Su Vercel i ritorni a capo di una chiave incollata come variabile possono
// arrivare come "\n" letterali: li ripristiniamo prima di firmare.
export const chiavePem = (valore: string) => valore.replace(/\\n/g, '\n');

// JWT RS256 richiesto su ogni chiamata (iss/aud fissi, durata massima 1 ora).
const jwt = (): string => {
  const b64 = (s: string | Buffer) => Buffer.from(s).toString('base64url');
  const iat = Math.floor(Date.now() / 1000);
  const header = b64(JSON.stringify({ typ: 'JWT', alg: 'RS256', kid: env('EB_APP_ID') }));
  const payload = b64(JSON.stringify({ iss: 'enablebanking.com', aud: 'api.enablebanking.com', iat, exp: iat + 3600 }));
  const firma = createSign('RSA-SHA256').update(`${header}.${payload}`).sign(chiavePem(env('EB_PRIVATE_KEY')));
  return `${header}.${payload}.${b64(firma)}`;
};

export const chiamaEB = async (metodo: 'GET' | 'POST', percorso: string, body?: unknown): Promise<any> => {
  const res = await fetch(`${API}${percorso}`, {
    method: metodo,
    headers: { Authorization: `Bearer ${jwt()}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  const testo = await res.text();
  if (!res.ok) throw new Error(`Enable Banking ${metodo} ${percorso} → ${res.status}: ${testo}`);
  return JSON.parse(testo);
};

/** Tutti i movimenti contabilizzati di un conto dal giorno indicato, seguendo la paginazione. */
export const scaricaMovimenti = async (uid: string, dal: string): Promise<any[]> => {
  const tutti: any[] = [];
  let continuation: string | undefined;
  do {
    const q = new URLSearchParams({ date_from: dal });
    if (continuation) q.set('continuation_key', continuation);
    const pagina = await chiamaEB('GET', `/accounts/${uid}/transactions?${q}`);
    tutti.push(...(pagina.transactions ?? []));
    continuation = pagina.continuation_key || undefined;
  } while (continuation);
  return tutti;
};
