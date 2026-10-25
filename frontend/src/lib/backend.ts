/**
 * Chiamate al backend Python (rotte /api/*, cartella backend/ del progetto).
 * In locale le serve `npm run api`, a cui Vite inoltra /api; online Vercel.
 *
 * Il token Google dell'utente viaggia in "Authorization: Bearer": il backend
 * lo usa per leggere e scrivere i fogli al posto del browser. Un 401 diventa
 * un errore che inizia per "UNAUTHENTICATED", come quelli che l'app già
 * riconosce per rinnovare la sessione (vedi refreshData in FinanceDataContext).
 * Gli altri errori portano il messaggio del backend, pensato per l'utente.
 */
export const chiamaBackend = async <T = any>(
  percorso: string,
  accessToken: string,
  opzioni: { metodo?: 'GET' | 'POST' | 'PUT'; corpo?: unknown } = {}
): Promise<T> => {
  const { metodo = 'GET', corpo } = opzioni;
  let res: Response;
  try {
    res = await fetch(`/api/${percorso}`, {
      method: metodo,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(corpo !== undefined ? { 'Content-Type': 'application/json' } : {})
      },
      body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
      cache: 'no-store'
    });
  } catch {
    throw new Error('Il server di Wally non risponde: controlla la connessione (in locale: è avviato npm run api?)');
  }
  const json = await res.json().catch(() => ({}));
  if (res.status === 401) throw new Error(json.errore || 'UNAUTHENTICATED: La sessione di Google è scaduta.');
  if (!res.ok) throw new Error(json.errore || `Richiesta a /api/${percorso} non riuscita (codice ${res.status})`);
  return json as T;
};
