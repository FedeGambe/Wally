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
      const posizioneRelativa = (rank - 1) / (n - 2);
      const bucket = Math.min(4, Math.floor(posizioneRelativa * 5));
      esiti[index] = BUCKET_INTERMEDI[bucket];
    }
  });

  return esiti;
}
