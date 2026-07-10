/**
 * SORGENTE DI VERITA' per la mappatura ogni scheda (tab) del Google Sheet
 * verso i campi/tipi usati nell'app.
 *
 * Per aggiungere o modificare una scheda del foglio Google (nuova colonna,
 * nuovo tab, rinominare un'intestazione, ...) si modifica SOLO l'array
 * SHEETS_CONFIG qui sotto: src/lib/sheetsService.tsx legge questo array e
 * cicla su di esso dinamicamente (fetchSpreadsheetData / pushSpreadsheetData),
 * non serve toccare quel file.
 *
 * Ogni voce di SHEETS_CONFIG dice:
 *  - `title`/`range`: nome del tab e intervallo di celle da leggere in Sheets
 *  - `fields`: nomi delle proprietà nell'oggetto JS (es. 'importo')
 *  - `headers`: intestazioni umane attese nella riga 1 del foglio (es. 'Importo')
 *    `fields[i]` e `headers[i]` sono allineati per indice.
 *  - `numberFields`/`booleanFields`: quali campi vanno convertiti da stringa
 *    a numero/booleano quando si legge dal foglio
 *  - `dataKey`: la chiave sotto cui questi dati finiscono nell'oggetto dati
 *    dell'app (lo stesso `dataKey` usato in getExportableData in mockData.ts)
 *
 * Le schede "Scalable" e "Trade Republic" (broker di investimento) hanno in
 * più delle colonne "dinamiche" che NON sono elencate qui: vengono scoperte a
 * runtime leggendo le righe 1-2 del foglio (vedi fetchSpreadsheetData).
 */
import {
  TARGET_PRIMARIE,
  TARGET_SECONDARIE,
  TARGET_INVESTIMENTI,
  TARGET_RISPARMIO,
  TARGET_NETTO
} from "./targets";
import { parseSheetColumns, toValidFieldName } from "../utils/sheetsUtils";

export { parseSheetColumns, toValidFieldName };

export interface SheetDefinition {
  title: string;
  range: string;
  fields: string[];
  headers: string[];
  numberFields?: string[];
  booleanFields?: string[];
  dataKey: string; // La chiave corrispondente nell'oggetto SheetsData
}

export function createDynamicSheetDefinition(
  title: string,
  row1: any[],
  row2: any[],
  dataKey: string
): SheetDefinition {
  const parsed = parseSheetColumns(row1, row2);
  return {
    title,
    range: `${title}!A:ZZ`,
    fields: parsed.fields,
    headers: parsed.headers,
    numberFields: parsed.numberFields,
    dataKey
  };
}

export const SHEETS_CONFIG: SheetDefinition[] = [
  {
    title: 'Uscite',
    range: 'Uscite!A:I',
    fields: ['data', 'mese', 'descrizione', 'macroCategoria', 'categoria', 'icon', 'conto', 'importo', 'primaria'],
    headers: ['Data', 'Mese', 'Descrizione della transazione', 'Macro categoria', 'Categoria della transazione', 'Icon', 'Conto utilizzato', 'Importo', 'Primarie'],
    booleanFields: ['primaria'],
    numberFields: ['importo'],
    dataKey: 'uscite'
  },
  {
    title: 'Entrate',
    range: 'Entrate!A:F',
    fields: ['mese', 'anno', 'categoria', 'conto', 'importo', 'dettagli'],
    headers: ['Mese', 'Anno', 'Categoria', 'Conto', 'Importo', 'Dettagli'],
    numberFields: ['anno', 'importo'],
    dataKey: 'entrate'
  },
  {
    title: 'Risparmio',
    range: 'Risparmio!A:P',
    fields: ['mese', 'entrate', 'speseTotali', 'spesePrimarie', `prim${TARGET_PRIMARIE}`, 'speseSecondarie', `sec${TARGET_SECONDARIE}`, 'spendibile', 'investiti', `inv${TARGET_INVESTIMENTI}`, 'risparmio', `risp${TARGET_RISPARMIO}`, 'nettoTotale', `netto${TARGET_NETTO}`, 'andamentoRisparmio', 'andamentoNetto'],
    headers: ['Mese', 'Entrate', 'Spese Totali', 'Spese Primarie', `${TARGET_PRIMARIE}%`, 'Spese Secondarie', `${TARGET_SECONDARIE}%`, 'Spendibile', 'Investiti', `${TARGET_INVESTIMENTI}% Inv`, 'Risparmio', `${TARGET_RISPARMIO}% Risp`, 'Netto Totale', `Netto ${TARGET_NETTO}%`, 'Andamento Risparmio', 'Andamento Netto'],
    numberFields: ['entrate', 'speseTotali', 'spesePrimarie', 'speseSecondarie', 'investiti', 'risparmio', 'andamentoRisparmio', 'andamentoNetto'],
    dataKey: 'risparmio'
  },
  {
    title: 'Patrimonio',
    range: 'Patrimonio!A:H',
    fields: ['categoria', 'capitaleTotale', 'capitaleDisponibile', 'capitaleInvestito', 'capitaleImpegnato', 'allarmeSoglia', 'rimanenteSoglia'],
    headers: ['Categoria', 'Capitale totale', 'Capitale disponibile', 'Capitale Investito', 'Capitale Impegnato', 'Allarme soglia 5000', 'Rimanente soglia'],
    numberFields: ['capitaleTotale', 'capitaleDisponibile', 'capitaleInvestito', 'capitaleImpegnato', 'allarmeSoglia', 'rimanenteSoglia'],
    dataKey: 'patrimonio'
  },
  {
    title: 'Capitale Impegnato',
    range: 'Capitale Impegnato!A:C',
    fields: ['categoria', 'capitaleImpegnato'],
    headers: ['Categoria', 'Capitale Impegnato'],
    numberFields: ['capitaleImpegnato'],
    dataKey: 'capitaleImpegnato'
  },
  {
    title: 'Rendimenti',
    range: 'Rendimenti!A:H',
    fields: ['mese', 'rendimentoMensileEuro', 'rendimentoMensilePerc', 'importoMensileInvestito', 'rendimentoCumulativoEuro', 'rendimentoCumulativoPerc', 'importoInvestitoCumulato', 'valoreAttualePortafoglio'],
    headers: ['Mese', 'Rendimento mensile €', 'Rendimento mensile %', 'Importo Mensile investito', 'Rendimento comulativo €', 'Rendimento comulativo %', 'Importo Investito', 'Somma attuale'],
    numberFields: ['rendimentoMensileEuro', 'rendimentoMensilePerc', 'importoMensileInvestito', 'rendimentoCumulativoEuro', 'rendimentoCumulativoPerc', 'importoInvestitoCumulato', 'valoreAttualePortafoglio'],
    dataKey: 'rendimentiInvestimenti'
  },
  {
    title: 'Scalable',
    range: 'Scalable!A:X',
    fields: ['mese', 'rendimentoMensileEuro', 'rendimentoMensilePerc', 'importoMensileInvestitoe', 'rendimentoCumulativoEuro', 'rendimentoCumulativoPerc', 'totaleInvestito', 'saldoConto', 'saldoContoCompleto','interessiConto', 'interessiContoComulativo', 'commissioniMensili', 'commissioniomulative', 'dividendi'],
    headers: ['Mese', 'Rendimento Mensile €', 'Rendimento Mensile %', 'Importo investito Mensile', 'Rendimento comulativo', 'Rendimento comulativo %', 'Totale investito', 'Saldo Conto', 'Saldo Conto Completo', 'Interessi conto', 'Interessi conto comulativo', 'Commissioni nel mese', 'Commissioni comulative', 'Dividendi'],
    numberFields: ['rendimentoMensileEuro', 'rendimentoMensilePerc', 'importoMensileInvestitoe', 'rendimentoCumulativoEuro', 'rendimentoCumulativoPerc', 'totaleInvestito', 'saldoConto', 'saldoContoCompleto','interessiConto', 'interessiContoComulativo', 'commissioniMensili', 'commissioniomulative', 'dividendi'],
    dataKey: 'scalable'
  },
  {
    title: 'Trade Republic',
    range: 'Trade Republic!A:ZZ',
    fields: ['mese', 'rendimentoMensileEuro', 'rendimentoMensilePerc', 'importoMensileInvestitoe', 'rendimentoCumulativoEuro', 'rendimentoCumulativoPerc', 'totaleInvestito', 'saldoConto', 'interessiConto', 'savebacks', 'commissioniMensili', 'commissioniomulative', 'dividendiIbonds', 'dividendiAmundi'],
    headers: ['Mese', 'Rendimento Mensile €', 'Rendimento Mensile %', 'Importo investito Mensile', 'Rendimento comulativo', 'Rendimento comulativo %', 'Totale investito', 'Saldo Conto', 'Interessi conto', 'Savebacks', 'Commissioni nel mese', 'Commissioni comulative', 'Dividendi iBonds', 'Dividendi Amundi'],
    numberFields: ['rendimentoMensileEuro', 'rendimentoMensilePerc', 'importoMensileInvestitoe', 'rendimentoCumulativoEuro', 'rendimentoCumulativoPerc', 'totaleInvestito', 'saldoConto', 'interessiConto', 'savebacks', 'commissioniMensili', 'commissioniomulative', 'dividendiIbonds', 'dividendiAmundi'],
    dataKey: 'tradeRepublic'
  },
  {
    title: 'Fondo Pensione',
    range: 'Fondo Pensione!A:G',
    fields: ['mese', 'tfr', 'contrBase', 'contrVolontaria', 'contrAzienda', 'totMensile', 'totAccumulato'],
    headers: ['Mese',	'TFR',	'Contribuzione base',	'Contribuzione volontaria',	'Contribuzione azienda',	'Totale mensile',	'Totale accumulato'],
    numberFields: ['tfr', 'contrBase', 'contrVolontaria', 'contrAzienda', 'totMensile', 'totAccumulato'],
    dataKey: 'fondoPensione'
  },
  {
    title: 'Cruscotto',
    range: 'Cruscotto!A:L',
    fields: ['anno', 'azioniInvestitoCum', 'azioniInvestitoAnno', 'obbligazioniInvestitoCum', 'obbligazioniInvestitoAnno', 'investitoCumulativo', 'investitoAnnuale', 'rendimentoCumulativoEuro', 'rendimentoAnnualeEuro', 'rendimentoMedioMensilePerc', 'rendimentoAnnuoStimatoPerc'],
    headers: ['Anno', 'Azioni comulativo', 'Azioni annuale', 'Obbligazioni cumulativo', 'Obbligazioni annuale', 'Investito cumulativo', 'Investito annuale', 'Rendimento cumulativo', 'Rendimento annuale', 'Rendimento % medio', 'Rendimento % annuale'],
    numberFields: ['anno', 'azioniInvestitoCum', 'azioniInvestitoAnno', 'obbligazioniInvestitoCum', 'obbligazioniInvestitoAnno', 'investitoCumulativo', 'investitoAnnuale', 'rendimentoCumulativoEuro', 'rendimentoAnnualeEuro', 'rendimentoMedioMensilePerc', 'rendimentoAnnuoStimatoPerc'],
    dataKey: 'cruscottoInvestimenti'
  },
  {
    title: 'Analisi consumi',
    range: 'Analisi consumi!A:P',
    fields: ['data', 'costo', 'quantitaLitri', 'prezzoAlLitro', 'kmFinali', 'kmEffettuati', 'litriPrecedenti', 'kmAlLitro', 'kmAlLitroAuto', 'euroPer100Km', 'litriPer100Km', 'kmPersi', 'kmPersiMediani', 'costoExtra', 'esitoSettimana', 'efficienzaPercentuale'],
    headers: ['Data', 'Costo', 'Quantità (Lt)', '€/Lt', 'Km finali', 'Km effettuati', 'Litri precedenti', 'Km/lt', 'Km/lt (auto)', '€/100km', 'Lt/100km', 'Km persi', 'km persi mediani', 'Costo extra', 'Esito settimana', 'Efficenza'],
    numberFields: ['costo', 'quantitaLitri', 'prezzoAlLitro', 'kmFinali', 'kmEffettuati', 'litriPrecedenti', 'kmAlLitro', 'kmAlLitroAuto', 'euroPer100Km', 'litriPer100Km', 'kmPersi', 'kmPersiMediani', 'costoExtra', 'efficienzaPercentuale'],
    dataKey: 'analisiConsumi'
  }
];

export const REQUIRED_SHEETS_TITLES = SHEETS_CONFIG.map(s => s.title);