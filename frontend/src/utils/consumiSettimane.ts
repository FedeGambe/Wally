const WEEK_MS = 7 * 24 * 3600 * 1000;

// Rifornimento ogni due settimane: la settimana precedente non ha rifornimenti (gap di 2 settimane
// tra le ancore martedì), quindi costo/litri/km coprono 2 settimane e si dividono per 2 per avere
// il valore "per settimana". Il costo si dimezza insieme ai litri, altrimenti €/100km raddoppia.
// Richiede `weeks` ordinato per anchorTime crescente. Gap di 3+ settimane: non toccato (può essere
// una vera pausa, non un rifornimento saltato).
export function dividiSeBisettimanale<T extends { anchorTime: number; costo: number; quantitaLitri: number; kmEffettuati: number }>(weeks: T[]): T[] {
  return weeks.map((w, i) => {
    const gap = i > 0 ? Math.round((w.anchorTime - weeks[i - 1].anchorTime) / WEEK_MS) : 1;
    return gap === 2
      ? { ...w, costo: w.costo / 2, quantitaLitri: w.quantitaLitri / 2, kmEffettuati: w.kmEffettuati / 2 }
      : w;
  });
}
