/**
 * Script LOCALE di esplorazione di Enable Banking (open banking PSD2): serve
 * a vedere che dati arrivano davvero dalle banche prima di costruire la
 * sincronizzazione nell'app. Non gira su Vercel e non scrive sul foglio.
 *
 * Configurazione in .env.local (ignorato da git):
 *   EB_APP_ID=<application id dal Control Panel di Enable Banking>
 *   EB_KEY_PATH=.banca/<application id>.pem   (chiave privata scaricata alla registrazione)
 *   EB_REDIRECT_URL=<uno degli URL di redirect registrati sull'applicazione>
 *
 * Comandi (npm run banca -- <comando>):
 *   banche <paese> [filtro]       elenca le banche disponibili (es. banche IT unicredit)
 *   collega <banca> <paese>       stampa il link per autorizzare l'accesso
 *   sessione <code>               chiude l'autorizzazione con il `code` del redirect
 *   movimenti [giorni]            scarica i movimenti di tutti i conti collegati (default 90)
 *
 * Sessioni e movimenti grezzi finiscono in .banca/ (ignorato da git).
 */
import { createSign, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const API = 'https://api.enablebanking.com';
const DIR = '.banca';
const SESSIONI = `${DIR}/sessioni.json`;

if (existsSync('.env.local')) process.loadEnvFile('.env.local');

const env = (nome: string): string => {
  const v = process.env[nome];
  if (!v) throw new Error(`Manca ${nome} in .env.local`);
  return v;
};

const base64url = (s: string | Buffer) => Buffer.from(s).toString('base64url');

// JWT RS256 firmato con la chiave privata dell'applicazione, come richiesto
// da Enable Banking su ogni chiamata (iss/aud fissi, durata massima 1 ora).
const jwt = (): string => {
  const iat = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ typ: 'JWT', alg: 'RS256', kid: env('EB_APP_ID') }));
  const payload = base64url(JSON.stringify({ iss: 'enablebanking.com', aud: 'api.enablebanking.com', iat, exp: iat + 3600 }));
  const firma = createSign('RSA-SHA256').update(`${header}.${payload}`).sign(readFileSync(env('EB_KEY_PATH')));
  return `${header}.${payload}.${base64url(firma)}`;
};

const chiama = async (metodo: 'GET' | 'POST', percorso: string, body?: unknown): Promise<any> => {
  const res = await fetch(`${API}${percorso}`, {
    method: metodo,
    headers: { Authorization: `Bearer ${jwt()}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  const testo = await res.text();
  if (!res.ok) throw new Error(`${metodo} ${percorso} → ${res.status}: ${testo}`);
  return JSON.parse(testo);
};

interface Sessione { sessionId: string; banca: string; scade: string; conti: { uid: string; iban?: string; nome?: string }[] }

const leggiSessioni = (): Sessione[] => existsSync(SESSIONI) ? JSON.parse(readFileSync(SESSIONI, 'utf8')) : [];

const banche = async (paese = 'IT', filtro = '') => {
  const { aspsps } = await chiama('GET', `/aspsps?country=${paese.toUpperCase()}`);
  const trovate = aspsps.filter((a: any) => a.name.toLowerCase().includes(filtro.toLowerCase()));
  for (const a of trovate) console.log(`${a.name} (${a.country}) · tipi: ${(a.psu_types ?? []).join(', ')} · consenso max ${a.maximum_consent_validity ? Math.round(a.maximum_consent_validity / 86400) + ' gg' : '?'}`);
  console.log(`\n${trovate.length} banche su ${aspsps.length}`);
};

const collega = async (banca: string, paese: string) => {
  // Durata del consenso: il massimo concesso dalla banca (180 gg UniCredit,
  // 90 gg Trade Republic) meno un giorno, perché chiedere esattamente il
  // massimo può superarlo di qualche secondo e la banca rifiuta con
  // error=invalid_request.
  const { aspsps } = await chiama('GET', `/aspsps?country=${paese.toUpperCase()}`);
  const info = aspsps.find((a: any) => a.name === banca);
  if (!info) throw new Error(`Banca "${banca}" non trovata in ${paese}: usa il nome esatto dato da "banche"`);
  const giorni = Math.max(1, Math.floor((info.maximum_consent_validity ?? 90 * 86400) / 86400) - 1);
  const scadenza = new Date(Date.now() + giorni * 86400_000).toISOString();
  const res = await chiama('POST', '/auth', {
    access: { valid_until: scadenza },
    aspsp: { name: banca, country: paese.toUpperCase() },
    state: randomUUID(),
    redirect_url: env('EB_REDIRECT_URL'),
    psu_type: 'personal'
  });
  console.log(`Apri questo link, autorizza dalla banca e copia il parametro "code" dall'indirizzo a cui vieni rimandato:\n\n${res.url}\n`);
  console.log('Poi: npm run banca -- sessione <code>');
};

const sessione = async (code: string) => {
  const res = await chiama('POST', '/sessions', { code });
  const nuova: Sessione = {
    sessionId: res.session_id,
    banca: `${res.aspsp.name} (${res.aspsp.country})`,
    scade: res.access.valid_until,
    conti: res.accounts.map((c: any) => ({ uid: c.uid, iban: c.account_id?.iban, nome: c.name ?? c.product }))
  };
  mkdirSync(DIR, { recursive: true });
  writeFileSync(SESSIONI, JSON.stringify([...leggiSessioni().filter(s => s.banca !== nuova.banca), nuova], null, 2));
  console.log(`Collegata ${nuova.banca}, scade il ${nuova.scade.slice(0, 10)}. Conti:`);
  for (const c of nuova.conti) console.log(`  ${c.nome ?? '-'} · ${c.iban ?? 'IBAN non fornito'}`);
};

const movimenti = async (giorni = 90) => {
  const dal = new Date(Date.now() - giorni * 86400_000).toISOString().slice(0, 10);
  const sessioni = leggiSessioni();
  if (sessioni.length === 0) throw new Error('Nessuna banca collegata: usa prima "collega" e "sessione"');
  mkdirSync(DIR, { recursive: true });

  for (const s of sessioni) {
    for (const conto of s.conti) {
      const tutte: any[] = [];
      let continuation: string | undefined;
      do {
        const q = new URLSearchParams({ date_from: dal });
        if (continuation) q.set('continuation_key', continuation);
        const pagina = await chiama('GET', `/accounts/${conto.uid}/transactions?${q}`);
        tutte.push(...(pagina.transactions ?? []));
        continuation = pagina.continuation_key || undefined;
      } while (continuation);

      writeFileSync(`${DIR}/movimenti-${conto.uid}.json`, JSON.stringify(tutte, null, 2));
      console.log(`\n=== ${s.banca} · ${conto.nome ?? ''} ${conto.iban ?? ''} · ${tutte.length} movimenti dal ${dal} ===`);
      for (const t of tutte) {
        const segno = t.credit_debit_indicator === 'DBIT' ? '-' : '+';
        const controparte = segno === '-' ? t.creditor : t.debtor;
        const ibanControparte = (segno === '-' ? t.creditor_account : t.debtor_account)?.iban;
        console.log([
          t.booking_date ?? t.value_date ?? '?',
          t.status === 'PDNG' ? '(in attesa)' : '',
          `${segno}${t.transaction_amount?.amount} ${t.transaction_amount?.currency}`,
          controparte?.name ?? '',
          ibanControparte ? `[${ibanControparte}]` : '',
          (t.remittance_information ?? []).join(' ')
        ].filter(Boolean).join(' · '));
      }
    }
  }
  console.log(`\nDati grezzi completi in ${DIR}/movimenti-*.json`);
};

const [comando, ...args] = process.argv.slice(2);
const comandi: Record<string, () => Promise<void>> = {
  banche: () => banche(args[0], args[1]),
  collega: () => collega(args[0], args[1] ?? 'IT'),
  sessione: () => sessione(args[0]),
  movimenti: () => movimenti(args[0] ? Number(args[0]) : undefined)
};

if (!comando || !comandi[comando]) {
  console.log('Comandi: banche <paese> [filtro] · collega <banca> <paese> · sessione <code> · movimenti [giorni]');
} else {
  comandi[comando]().catch(e => { console.error(e.message); process.exit(1); });
}
