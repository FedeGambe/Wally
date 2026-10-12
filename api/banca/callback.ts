/**
 * GET /api/banca/callback?state=...&code=...
 * Ritorno dalla banca dopo l'autorizzazione: apre la sessione su Enable
 * Banking, salva i conti in "Banca Collegamenti" e rimanda l'utente su Wally
 * con ?banca=collegata (o ?banca=errore&motivo=...).
 */
import { chiamaEB, env } from '../_lib/enableBanking.js';
import { leggiState } from '../_lib/accesso.js';
import { assicuraScheda, leggiScheda, riscriviScheda } from '../_lib/google.js';
import { COLLEGAMENTI, daRigaCollegamento, aRigaCollegamento, type Collegamento } from '../_lib/schede.js';

const tornaAWally = (request: Request, parametri: Record<string, string>) =>
  Response.redirect(`${new URL(request.url).origin}/?${new URLSearchParams(parametri)}`, 302);

// Conto di Wally proposto per un conto appena collegato; si corregge a mano
// nella colonna "Conto Wally" del foglio se non è quello giusto.
const contoWallyPredefinito = (banca: string) => banca === 'UniCredit' ? 'Unicredit' : banca;

export async function GET(request: Request) {
  const parametri = new URL(request.url).searchParams;
  const state = leggiState(parametri.get('state') ?? '');
  if (!state) return tornaAWally(request, { banca: 'errore', motivo: 'Collegamento scaduto o non partito da Wally' });
  const code = parametri.get('code');
  if (!code) return tornaAWally(request, { banca: 'errore', motivo: parametri.get('error_description') || parametri.get('error') || 'Autorizzazione annullata' });

  try {
    const sessione = await chiamaEB('POST', '/sessions', { code });
    const foglio = env('VITE_DEFAULT_CONFIG_SPREADSHEET_ID');
    await assicuraScheda(foglio, COLLEGAMENTI.titolo, COLLEGAMENTI.intestazioni);
    const esistenti = (await leggiScheda(foglio, COLLEGAMENTI.titolo)).map(daRigaCollegamento);
    const oggi = new Date().toISOString().slice(0, 10);

    const nuovi: Collegamento[] = sessione.accounts.map((a: any) => {
      const iban = a.account_id?.iban ?? '';
      const precedente = esistenti.find(e => iban && e.iban === iban);
      return {
        banca: state.banca,
        paese: state.paese,
        sessione: sessione.session_id,
        scadenza: sessione.access.valid_until.slice(0, 10),
        account: a.uid,
        iban,
        contoWally: precedente?.contoWally || contoWallyPredefinito(state.banca),
        // Al primo collegamento si parte da oggi: i movimenti precedenti sono
        // già in Wally, inseriti a mano. Al rinnovo si riprende da dove si era.
        sincronizzaDal: precedente?.sincronizzaDal || oggi
      };
    });
    const ibanNuovi = new Set(nuovi.map(n => n.iban).filter(Boolean));
    const restanti = esistenti.filter(e => e.banca !== state.banca && !ibanNuovi.has(e.iban));
    await riscriviScheda(foglio, COLLEGAMENTI.titolo, COLLEGAMENTI.intestazioni, [...restanti, ...nuovi].map(aRigaCollegamento));

    return tornaAWally(request, { banca: 'collegata', nome: state.banca });
  } catch (e) {
    console.error(e);
    return tornaAWally(request, { banca: 'errore', motivo: (e as Error).message.slice(0, 200) });
  }
}
