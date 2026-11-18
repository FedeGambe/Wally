/**
 * Calcola un "voto" testuale (Migliore/Ottima/.../Peggiore) per ogni settimana registrata
 * nella pagina Analisi Consumi (consumo carburante auto), mettendo in classifica le settimane
 * per punteggio (colonna "Efficienza" del foglio, 0-1, più alto è meglio): non c'è una soglia
 * fissa, il giudizio è sempre relativo alle altre settimane registrate. Il foglio fa la stessa
 * classifica nella colonna O. Usato da src/hooks/useAnalisiConsumiData.ts.
 */
export type EsitoSettimana = 'Migliore' | 'Ottima' | 'Buona' | 'Nella media' | 'Non buona' | 'Scarsa' | 'Peggiore';

interface RigaConsumo {
  efficienzaPercentuale: number;
}

const BUCKET_INTERMEDI: EsitoSettimana[] = ['Ottima', 'Buona', 'Nella media', 'Non buona', 'Scarsa'];

// Calcola l'esito di ogni settimana relativamente a tutto lo storico.
// Migliore e Peggiore vengono assegnati a un solo record ciascuno (punteggio massimo e minimo).
export function calcolaEsitiSettimanali<T extends RigaConsumo>(records: T[]): EsitoSettimana[] {
  const n = records.length;
  if (n === 0) return [];
  if (n === 1) return ['Nella media'];

  // Punteggio più alto = settimana migliore: si ordina dal più alto al più basso
  const ordineRank = records
    .map((r, index) => ({ punteggio: r.efficienzaPercentuale || 0, index }))
    .sort((a, b) => b.punteggio - a.punteggio);

  const esiti: EsitoSettimana[] = new Array(n);
  ordineRank.forEach(({ index }, rank) => {
    if (rank === 0) {
      esiti[index] = 'Migliore';
    } else if (rank === n - 1) {
      esiti[index] = 'Peggiore';
    } else {
      // Tutte le settimane "di mezzo" (escluse Migliore/Peggiore) vengono divise in 5 fasce
      // uguali in base alla loro posizione in classifica (percentile), non al valore assoluto
      // del punteggio: posizioneRelativa va da 0 (appena dopo la migliore) a 1 (appena prima
      // della peggiore). Math.min(4, ...) evita che un arrotondamento porti bucket a 5
      // (fuori dai 5 elementi validi dell'array, indici 0-4).
      const posizioneRelativa = (rank - 1) / (n - 2);
      const bucket = Math.min(4, Math.floor(posizioneRelativa * 5));
      esiti[index] = BUCKET_INTERMEDI[bucket];
    }
  });

  return esiti;
}
