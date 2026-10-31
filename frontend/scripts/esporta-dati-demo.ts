/**
 * Stampa in JSON i dati finti della modalità incognito (data/demoData.ts),
 * nella stessa forma che l'app manda al backend. Lo usa
 * `npm run previsioni:demo` per rigenerare data/demoPrevisioni.json.
 */
const memoria = new Map<string, string>([['sf_incognito_mode', 'true']]);
(globalThis as any).localStorage = {
  getItem: (k: string) => memoria.get(k) ?? null,
  setItem: (k: string, v: string) => { memoria.set(k, v); },
  removeItem: (k: string) => { memoria.delete(k); },
};

const { getExportableData } = await import('../src/data/mockData');
const { CHIAVI_DATI } = await import('../src/lib/previsioniService');
const dati = getExportableData(true) as Record<string, unknown>;
process.stdout.write(JSON.stringify(Object.fromEntries(CHIAVI_DATI.map(k => [k, dati[k]]))));
