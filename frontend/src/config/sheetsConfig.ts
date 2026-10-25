/**
 * La mappa delle schede del foglio Google (colonne, campi, formule) sta nel
 * backend Python: backend/models/foglio.py. È l'unica: letture e scritture
 * passano tutte da lì.
 *
 * Qui resta solo quello che serve alle pagine senza chiedere al backend.
 */
import { TARGET_PRIMARIE, TARGET_SECONDARIE, TARGET_INVESTIMENTI, TARGET_RISPARMIO, TARGET_NETTO } from './targets';

// Intestazioni della scheda Risparmio, usate da Panoramica e Uscite finché il
// foglio non ha mandato le sue (risparmioHeaders). Uguali a quelle della
// scheda "Risparmio" in backend/models/foglio.py.
export const INTESTAZIONI_RISPARMIO = [
  'Mese', 'Entrate', 'Spese Totali', 'Spese Primarie', `${TARGET_PRIMARIE}%`, 'Spese Secondarie',
  `${TARGET_SECONDARIE}%`, 'Spendibile', 'Investiti', `${TARGET_INVESTIMENTI}% Inv`, 'Risparmio',
  `${TARGET_RISPARMIO}% Risp`, 'Netto Totale', `Netto ${TARGET_NETTO}%`, 'Andamento Risparmio', 'Andamento Netto'
];
