/**
 * Calcola un "voto" testuale (Migliore/Ottima/.../Peggiore) per ogni settimana registrata
 * nella pagina Analisi Consumi (consumo carburante auto), confrontando ogni settimana con
 * tutto lo storico: non c'è una soglia fissa, il giudizio è sempre relativo alle altre
 * settimane registrate. Usato da src/pages/AnalisiConsumi.tsx.
 */
export type EsitoSettimana = 'Migliore' | 'Ottima' | 'Buona' | 'Nella media' | 'Non buona' | 'Scarsa' | 'Peggiore';

interface RigaConsumo {
  kmEffettuati: number;
  prezzoAlLitro: number;
  kmAlLitro: number;
}

function mediana(valori: number[]): number {
  const ordinati = [...valori].sort((a, b) => a - b);
  const meta = Math.floor(ordinati.length / 2);
  return ordinati.length % 2 !== 0
    ? ordinati[meta]
    : (ordinati[meta - 1] + ordinati[meta]) / 2;
}

const BUCKET_INTERMEDI: EsitoSettimana[] = ['Ottima', 'Buona', 'Nella media', 'Non buona', 'Scarsa'];

// Punteggio: costo extra (positivo) o risparmio (negativo) rispetto al consumo mediano
function calcolaScore(riga: RigaConsumo, medianaKmAlLitro: number): number {
  if (!riga.kmAlLitro || !medianaKmAlLitro) return 0;
  return riga.kmEffettuati * riga.prezzoAlLitro * (1 / riga.kmAlLitro - 1 / medianaKmAlLitro);
}

// Calcola l'esito di ogni settimana relativamente a tutto lo storico.
// Migliore e Peggiore vengono assegnati a un solo record ciascuno (lo score minimo e massimo).
export function calcolaEsitiSettimanali<T extends RigaConsumo>(records: T[]): EsitoSettimana[] {
  const n = records.length;
  if (n === 0) return [];
  if (n === 1) return ['Nella media'];

  const medianaKmAlLitro = mediana(records.map(r => r.kmAlLitro));
  const scores = records.map(r => calcolaScore(r, medianaKmAlLitro));

  const ordineRank = scores
    .map((score, index) => ({ score, index }))
    .sort((a, b) => a.score - b.score);

  const esiti: EsitoSettimana[] = new Array(n);
  ordineRank.forEach(({ index }, rank) => {
    if (rank === 0) {
      esiti[index] = 'Migliore';
    } else if (rank === n - 1) {
      esiti[index] = 'Peggiore';
    } else {
      // Tutte le settimane "di mezzo" (escluse Migliore/Peggiore) vengono divise in 5 fasce
      // uguali in base alla loro posizione in classifica (percentile), non al valore assoluto
      // dello score: posizioneRelativa va da 0 (appena dopo la migliore) a 1 (appena prima
      // della peggiore). Math.min(4, ...) evita che un arrotondamento porti bucket a 5
      // (fuori dai 5 elementi validi dell'array, indici 0-4).
      const posizioneRelativa = (rank - 1) / (n - 2);
      const bucket = Math.min(4, Math.floor(posizioneRelativa * 5));
      esiti[index] = BUCKET_INTERMEDI[bucket];
    }
  });

  return esiti;
}
