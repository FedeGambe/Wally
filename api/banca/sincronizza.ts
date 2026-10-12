/**
 * GET  /api/banca/sincronizza   dal cron di Vercel (una volta al giorno, piano Hobby)
 * POST /api/banca/sincronizza   dal pulsante "Sincronizza ora" di Wally
 *
 * Scarica i movimenti nuovi di tutti i conti in "Banca Collegamenti" e li
 * accoda in "Movimenti Banca". Non classifica e non registra niente: lo fa
 * Wally all'apertura (src/utils/movimentiBanca.ts), con i preset aggiornati e
 * con tutti i movimenti sotto mano, così un giro tra conti i cui due lati
 * arrivano in giorni diversi viene comunque abbinato.
 */
import { env, scaricaMovimenti } from '../_lib/enableBanking.js';
import { daCron, daProprietario, nonAutorizzato } from '../_lib/accesso.js';
import { assicuraScheda, leggiScheda, aggiungiRighe } from '../_lib/google.js';
import { COLLEGAMENTI, MOVIMENTI, daRigaCollegamento } from '../_lib/schede.js';
import { normalizzaMovimenti } from '../../src/utils/movimentiBanca.js';

// Ogni volta si riscaricano gli ultimi giorni: le banche contabilizzano con
// qualche giorno di ritardo, e i doppioni si scartano con l'ID.
const GIORNI_INDIETRO = 10;

const sincronizza = async () => {
  const oggi = new Date().toISOString().slice(0, 10);
  const daGiorni = new Date(Date.now() - GIORNI_INDIETRO * 86400_000).toISOString().slice(0, 10);

  const collegamenti = (await leggiScheda(env('VITE_DEFAULT_CONFIG_SPREADSHEET_ID'), COLLEGAMENTI.titolo).catch(() => []))
    .map(daRigaCollegamento)
    .filter(c => c.account && c.contoWally);

  const finanza = env('VITE_DEFAULT_SPREADSHEET_ID');
  await assicuraScheda(finanza, MOVIMENTI.titolo, MOVIMENTI.intestazioni);
  const giaPresenti = new Set((await leggiScheda(finanza, MOVIMENTI.titolo)).map(r => r['ID']));

  const esito = { aggiunti: 0, perConto: {} as Record<string, number>, scaduti: [] as string[], errori: [] as string[] };
  const righe: (string | number)[][] = [];

  for (const c of collegamenti) {
    const etichetta = `${c.banca} → ${c.contoWally}`;
    if (c.scadenza && c.scadenza < oggi) {
      esito.scaduti.push(etichetta);
      continue;
    }
    try {
      const dal = c.sincronizzaDal > daGiorni ? c.sincronizzaDal : daGiorni;
      // Il filtro sulla data va rifatto qui: Trade Republic ignora date_from
      // e restituisce comunque tutti i movimenti recenti.
      const nuovi = normalizzaMovimenti(await scaricaMovimenti(c.account, dal), c.contoWally)
        .filter(m => m.data >= dal && !giaPresenti.has(m.id));
      for (const m of nuovi) {
        giaPresenti.add(m.id);
        righe.push([m.id, m.data, m.conto, m.importo, m.descrizione, '', oggi]);
      }
      esito.perConto[etichetta] = (esito.perConto[etichetta] ?? 0) + nuovi.length;
    } catch (e) {
      console.error(e);
      esito.errori.push(`${etichetta}: ${(e as Error).message.slice(0, 200)}`);
    }
  }

  righe.sort((a, b) => String(a[1]).localeCompare(String(b[1])));
  await aggiungiRighe(finanza, MOVIMENTI.titolo, righe);
  esito.aggiunti = righe.length;
  return esito;
};

export async function GET(request: Request) {
  if (!daCron(request)) return nonAutorizzato();
  return Response.json(await sincronizza());
}

export async function POST(request: Request) {
  if (!(await daProprietario(request))) return nonAutorizzato();
  return Response.json(await sincronizza());
}
