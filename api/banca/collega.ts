/**
 * POST /api/banca/collega  { banca: "UniCredit", paese: "IT" }
 * Avvia il collegamento (o il rinnovo) di una banca e risponde con { url }:
 * Wally ci manda l'utente, che autorizza dalla banca e torna su
 * /api/banca/callback.
 */
import { chiamaEB, env } from '../_lib/enableBanking.js';
import { creaState, daProprietario, nonAutorizzato } from '../_lib/accesso.js';

export async function POST(request: Request) {
  if (!(await daProprietario(request))) return nonAutorizzato();
  const { banca, paese = 'IT' } = await request.json();
  if (!banca) return Response.json({ errore: 'Banca mancante' }, { status: 400 });

  // Durata del consenso: il massimo della banca meno un giorno (chiedere
  // esattamente il massimo può superarlo di qualche secondo → invalid_request).
  const { aspsps } = await chiamaEB('GET', `/aspsps?country=${paese}`);
  const info = aspsps.find((a: any) => a.name === banca);
  if (!info) return Response.json({ errore: `Banca "${banca}" non disponibile in ${paese}` }, { status: 400 });
  const giorni = Math.max(1, Math.floor((info.maximum_consent_validity ?? 90 * 86400) / 86400) - 1);

  const { url } = await chiamaEB('POST', '/auth', {
    access: { valid_until: new Date(Date.now() + giorni * 86400_000).toISOString() },
    aspsp: { name: banca, country: paese },
    state: creaState(banca, paese),
    redirect_url: env('EB_REDIRECT_URL'),
    psu_type: 'personal'
  });
  return Response.json({ url });
}
