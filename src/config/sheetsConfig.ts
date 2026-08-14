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
  // Campi data: scritti in ISO YYYY-MM-DD al push, l'unico formato che Google
  // Sheets interpreta sempre allo stesso modo indipendentemente dal locale del
  // foglio (DD/MM/YYYY viene letto come MM/DD/YYYY o rifiutato come testo su
  // un foglio con locale US se il giorno supera 12).
  dateFields?: string[];
  // Colonne che sul foglio reale sono FORMULE (dedotte da altre colonne della
  // stessa riga, es. "Mese" calcolato da "Data", "Icon" da un lookup sulla
  // categoria), non campi scrivibili — l'append (appendRowToSheet in
  // sheetsService.tsx) non le tocca mai, altrimenti cancella la formula.
  // Scoperto verificando cella per cella il foglio reale dopo che due push
  // avevano corrotto il file sovrascrivendole con valori statici.
  formulaFields?: string[];
  // Campi che l'app tiene come nome del mese (stringa, es. "Agosto") ma che
  // sul foglio reale sono una vera data (day=1 del mese, es. 01/08/2026) da
  // cui la colonna "Anno" (in formulaFields) si deriva con una formula
  // (=A2). Il valore effettivo scritto viene ricostruito da `mese` + dal
  // valore corrente del campo `anno` sul record.
  monthDateFields?: string[];
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
    title: 'Conti',
    range: 'Conti!A:A',
    fields: ['nome'],
    headers: ['Conto'],
    dataKey: 'contiRows'
  },
  {
    title: 'Categorie Entrate',
    range: 'Categorie Entrate!A:A',
    fields: ['nome'],
    headers: ['Categoria'],
    dataKey: 'categorieEntrateRows'
  },
  {
    title: 'Categorie Uscite',
    range: 'Categorie Uscite!A:C',
    fields: ['macro', 'icon', 'categoria'],
    headers: ['Macro Categoria', 'Icona', 'Categoria'],
    dataKey: 'categorieUsciteRows'
  },
  {
    title: 'Soglie',
    range: 'Soglie!A:B',
    fields: ['categoria', 'percentuale'],
    headers: ['Categoria', 'Percentuale'],
    numberFields: ['percentuale'],
    dataKey: 'soglieRows'
  },
  {
    title: 'Preset Uscite Ricorrenti',
    range: 'Preset Uscite Ricorrenti!A:G',
    fields: ['giornoDelMese', 'nome', 'macroCategoria', 'categoria', 'conto', 'importo', 'primaria'],
    headers: ['Giorno del Mese', 'Nome', 'Macro Categoria', 'Categoria', 'Conto', 'Importo', 'Primaria'],
    booleanFields: ['primaria'],
    numberFields: ['giornoDelMese', 'importo'],
    dataKey: 'presetUsciteRows'
  },
  {
    title: 'Preset Trasferimenti Ricorrenti',
    range: 'Preset Trasferimenti Ricorrenti!A:D',
    fields: ['categoria', 'contoOrdinante', 'contoBeneficiario', 'importo'],
    headers: ['Categoria', 'Conto ordinante', 'Conto beneficiario', 'Importo'],
    numberFields: ['importo'],
    dataKey: 'presetTrasferimentiRows'
  },
  {
    title: 'Uscite',
    range: 'Uscite!A:I',
    fields: ['data', 'mese', 'descrizione', 'macroCategoria', 'categoria', 'icon', 'conto', 'importo', 'primaria'],
    headers: ['Data', 'Mese', 'Descrizione della transazione', 'Macro categoria', 'Categoria della transazione', 'Icon', 'Conto utilizzato', 'Importo', 'Primarie'],
    booleanFields: ['primaria'],
    numberFields: ['importo'],
    dateFields: ['data'],
    formulaFields: ['mese', 'icon'],
    dataKey: 'uscite'
  },
  {
    title: 'Entrate',
    range: 'Entrate!A:F',
    fields: ['mese', 'anno', 'categoria', 'conto', 'importo', 'dettagli'],
    headers: ['Mese', 'Anno', 'Categoria', 'Conto', 'Importo', 'Dettagli'],
    numberFields: ['anno', 'importo'],
    formulaFields: ['anno'],
    monthDateFields: ['mese'],
    dataKey: 'entrate'
  },
  {
    title: 'Risparmio',
    range: 'Risparmio!A:P',
    fields: ['mese', 'entrate', 'speseTotali', 'spesePrimarie', `prim${TARGET_PRIMARIE}`, 'speseSecondarie', `sec${TARGET_SECONDARIE}`, 'spendibile', 'investiti', `inv${TARGET_INVESTIMENTI}`, 'risparmio', `risp${TARGET_RISPARMIO}`, 'nettoTotale', `netto${TARGET_NETTO}`, 'andamentoRisparmio', 'andamentoNetto'],
    headers: ['Mese', 'Entrate', 'Spese Totali', 'Spese Primarie', `${TARGET_PRIMARIE}%`, 'Spese Secondarie', `${TARGET_SECONDARIE}%`, 'Spendibile', 'Investiti', `${TARGET_INVESTIMENTI}% Inv`, 'Risparmio', `${TARGET_RISPARMIO}% Risp`, 'Netto Totale', `Netto ${TARGET_NETTO}%`, 'Andamento Risparmio', 'Andamento Netto'],
    numberFields: ['entrate', 'speseTotali', 'spesePrimarie', 'speseSecondarie', 'spendibile', 'investiti', 'risparmio', 'andamentoRisparmio', 'andamentoNetto'],
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
    range: 'Scalable!A:ZZ',
    fields: ['mese', 'rendimentoMensileEuro', 'rendimentoMensilePerc', 'importoMensileInvestitoe', 'rendimentoCumulativoEuro', 'rendimentoCumulativoPerc', 'totaleInvestito', 'saldoConto', 'saldoContoCompleto', 'interessiConto', 'interessiContoComulativo', 'commissioniMensili', 'commissioniomulative', 'dividendi'],
    headers: ['Mese', 'Rendimento Mensile €', 'Rendimento Mensile %', 'Importo investito Mensile', 'Rendimento comulativo', 'Rendimento comulativo %', 'Totale investito', 'Saldo Conto', 'Saldo Conto Completo', 'Interessi conto', 'Interessi conto comulativo', 'Commissioni nel mese', 'Commissioni comulative', 'Dividendi'],
    numberFields: ['rendimentoMensileEuro', 'rendimentoMensilePerc', 'importoMensileInvestitoe', 'rendimentoCumulativoEuro', 'rendimentoCumulativoPerc', 'totaleInvestito', 'saldoConto', 'saldoContoCompleto', 'interessiConto', 'interessiContoComulativo', 'commissioniMensili', 'commissioniomulative', 'dividendi'],
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
    headers: ['Mese', 'TFR', 'Contribuzione base', 'Contribuzione volontaria', 'Contribuzione azienda', 'Totale mensile', 'Totale accumulato'],
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
    title: 'Trasferimenti',
    range: 'Trasferimenti!A:F',
    fields: ['mese', 'anno', 'categoria', 'contoOrdinante', 'contoBeneficiario', 'importo'],
    headers: ['Mese', 'Anno', 'Categoria', 'Conto ordinante', 'Conto beneficiario', 'Importo'],
    numberFields: ['anno', 'importo'],
    formulaFields: ['anno'],
    monthDateFields: ['mese'],
    dataKey: 'trasferimenti'
  },
  {
    title: 'Analisi consumi',
    range: 'Analisi consumi!A:P',
    fields: ['data', 'costo', 'quantitaLitri', 'prezzoAlLitro', 'kmFinali', 'kmEffettuati', 'litriPrecedenti', 'kmAlLitro', 'kmAlLitroAuto', 'euroPer100Km', 'litriPer100Km', 'kmPersi', 'kmPersiMediani', 'costoExtra', 'esitoSettimana', 'efficienzaPercentuale'],
    headers: ['Data', 'Costo', 'Quantità (Lt)', '€/Lt', 'Km finali', 'Km effettuati', 'Litri precedenti', 'Km/lt', 'Km/lt (auto)', '€/100km', 'Lt/100km', 'Km persi', 'km persi mediani', 'Costo extra', 'Esito settimana', 'Efficienza'],
    numberFields: ['costo', 'quantitaLitri', 'prezzoAlLitro', 'kmFinali', 'kmEffettuati', 'litriPrecedenti', 'kmAlLitro', 'kmAlLitroAuto', 'euroPer100Km', 'litriPer100Km', 'kmPersi', 'kmPersiMediani', 'costoExtra', 'efficienzaPercentuale'],
    dateFields: ['data'],
    // Colonne calcolate dal foglio Google (formula = riga sopra shiftata di 1, vedi
    // appendRowToSheet in sheetsService.tsx): l'app non le ricalcola mai da sola.
    formulaFields: ['kmEffettuati', 'litriPrecedenti', 'kmAlLitro', 'euroPer100Km', 'litriPer100Km', 'kmPersi', 'kmPersiMediani', 'costoExtra', 'esitoSettimana'],
    dataKey: 'analisiConsumi'
  }
];

// Tab che ensureSheetsExist NON deve creare automaticamente sul foglio principale:
// Conti/Categorie arrivano dal foglio di configurazione (vedi
// fetchDatiBaseFromConfigSheet), Preset e Fondo Pensione sono a scelta
// dell'utente — crearli vuoti su ogni push sarebbe rumore indesiderato.
const TAB_NON_AUTOCREABILI = [
  'Conti',
  'Categorie Entrate',
  'Categorie Uscite',
  'Preset Uscite Ricorrenti',
  'Preset Trasferimenti Ricorrenti',
  'Fondo Pensione'
];

export const REQUIRED_SHEETS_TITLES = SHEETS_CONFIG
  .map(s => s.title)
  .filter(title => !TAB_NON_AUTOCREABILI.includes(title));