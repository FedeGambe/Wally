"""
Mappa delle schede (tab) del foglio Google verso i campi usati nell'app.
Unica fonte: la usano sia le letture sia le scritture. Per aggiungere o
cambiare una colonna o una scheda si modifica solo questo file.

Ogni scheda dice:
 - titolo/intervallo: nome del tab e celle da leggere;
 - campi: nomi delle proprietà negli oggetti che arrivano all'app (camelCase,
   come li usa il frontend);
 - intestazioni: intestazioni attese nella riga 1, allineate a `campi`;
 - numerici/booleani: campi da convertire in numero o vero/falso;
 - chiave: dove finiscono i dati nell'oggetto restituito all'app;
 - date: campi data, scritti come gg/mm/aaaa nelle righe nuove;
 - date_mese: campi che l'app tiene come nome del mese ("Agosto") ma che sul
   foglio sono una data vera (01/08/2026), costruita con il campo `anno`;
 - formule: colonne che sul foglio sono FORMULE (es. "Mese" ricavato da
   "Data"). Una riga nuova non ci scrive un valore: copia la formula della riga
   sopra. Scoperto dopo che due scritture avevano cancellato formule del
   foglio con valori fissi.

Le schede "Scalable" e "Trade Republic" hanno in più colonne "dinamiche"
(una per strumento) scoperte leggendo le righe 1-2 del foglio.
"""
from dataclasses import dataclass, field

# Percentuali obiettivo del piano di risparmio (frontend/src/config/targets.ts):
# compaiono nei nomi di alcune colonne della scheda Risparmio.
TARGET_PRIMARIE = 35
TARGET_SECONDARIE = 15
TARGET_INVESTIMENTI = 25
TARGET_RISPARMIO = 100 - TARGET_PRIMARIE - TARGET_SECONDARIE - TARGET_INVESTIMENTI
TARGET_NETTO = TARGET_INVESTIMENTI + TARGET_RISPARMIO


@dataclass(frozen=True)
class SchedaFoglio:
    titolo: str
    intervallo: str
    campi: list[str]
    intestazioni: list[str]
    chiave: str
    numerici: list[str] = field(default_factory=list)
    booleani: list[str] = field(default_factory=list)
    date: list[str] = field(default_factory=list)
    date_mese: list[str] = field(default_factory=list)
    formule: list[str] = field(default_factory=list)


SCHEDE: list[SchedaFoglio] = [
    SchedaFoglio(
        titolo="Conti", intervallo="Conti!A:A",
        campi=["nome"], intestazioni=["Conto"],
        chiave="contiRows",
    ),
    SchedaFoglio(
        titolo="Categorie Entrate", intervallo="Categorie Entrate!A:A",
        campi=["nome"], intestazioni=["Categoria"],
        chiave="categorieEntrateRows",
    ),
    SchedaFoglio(
        titolo="Categorie Uscite", intervallo="Categorie Uscite!A:C",
        campi=["macro", "icon", "categoria"],
        intestazioni=["Macro Categoria", "Icona", "Categoria"],
        chiave="categorieUsciteRows",
    ),
    SchedaFoglio(
        titolo="Soglie", intervallo="Soglie!A:B",
        campi=["categoria", "percentuale"], intestazioni=["Categoria", "Percentuale"],
        numerici=["percentuale"],
        chiave="soglieRows",
    ),
    SchedaFoglio(
        titolo="Preset Uscite Ricorrenti", intervallo="Preset Uscite Ricorrenti!A:G",
        campi=["giornoDelMese", "nome", "macroCategoria", "categoria", "conto", "importo", "primaria"],
        intestazioni=["Giorno del Mese", "Nome", "Macro Categoria", "Categoria", "Conto", "Importo", "Primaria"],
        booleani=["primaria"],
        numerici=["giornoDelMese", "importo"],
        chiave="presetUsciteRows",
    ),
    SchedaFoglio(
        titolo="Preset Trasferimenti Ricorrenti", intervallo="Preset Trasferimenti Ricorrenti!A:D",
        campi=["categoria", "contoOrdinante", "contoBeneficiario", "importo"],
        intestazioni=["Categoria", "Conto ordinante", "Conto beneficiario", "Importo"],
        numerici=["importo"],
        chiave="presetTrasferimentiRows",
    ),
    # Un solo valore: la quota TFR mensile (A2), sotto l'intestazione in A1.
    SchedaFoglio(
        titolo="Preset Fondo Pensione", intervallo="Preset Fondo Pensione!A:A",
        campi=["quota"], intestazioni=["Quota Fondo Pensione"],
        numerici=["quota"],
        chiave="presetFondoPensioneRows",
    ),
    # Scheda a MATRICE (riga 1 = "Conto" + uno strumento per colonna, una riga
    # per broker): letta a parte da preset_investimenti_da_matrice, campi e
    # intestazioni qui sono solo segnaposto.
    SchedaFoglio(
        titolo="Preset Investimenti Ricorrenti", intervallo="Preset Investimenti Ricorrenti!A:ZZ",
        campi=["conto"], intestazioni=["Conto"],
        chiave="presetInvestimentiRows",
    ),
    SchedaFoglio(
        titolo="Uscite", intervallo="Uscite!A:I",
        campi=["data", "mese", "descrizione", "macroCategoria", "categoria", "icon", "conto", "importo", "primaria"],
        intestazioni=["Data", "Mese", "Descrizione della transazione", "Macro categoria",
                      "Categoria della transazione", "Icon", "Conto utilizzato", "Importo", "Primarie"],
        booleani=["primaria"],
        numerici=["importo"],
        date=["data"],
        formule=["mese", "icon"],
        chiave="uscite",
    ),
    SchedaFoglio(
        titolo="Entrate", intervallo="Entrate!A:F",
        campi=["mese", "anno", "categoria", "conto", "importo", "dettagli"],
        intestazioni=["Mese", "Anno", "Categoria", "Conto", "Importo", "Dettagli"],
        numerici=["anno", "importo"],
        formule=["anno"],
        date_mese=["mese"],
        chiave="entrate",
    ),
    SchedaFoglio(
        titolo="Risparmio", intervallo="Risparmio!A:P",
        campi=["mese", "entrate", "speseTotali", "spesePrimarie", f"prim{TARGET_PRIMARIE}", "speseSecondarie",
               f"sec{TARGET_SECONDARIE}", "spendibile", "investiti", f"inv{TARGET_INVESTIMENTI}", "risparmio",
               f"risp{TARGET_RISPARMIO}", "nettoTotale", f"netto{TARGET_NETTO}", "andamentoRisparmio", "andamentoNetto"],
        intestazioni=["Mese", "Entrate", "Spese Totali", "Spese Primarie", f"{TARGET_PRIMARIE}%", "Spese Secondarie",
                      f"{TARGET_SECONDARIE}%", "Spendibile", "Investiti", f"{TARGET_INVESTIMENTI}% Inv", "Risparmio",
                      f"{TARGET_RISPARMIO}% Risp", "Netto Totale", f"Netto {TARGET_NETTO}%", "Andamento Risparmio",
                      "Andamento Netto"],
        numerici=["entrate", "speseTotali", "spesePrimarie", "speseSecondarie", "spendibile", "investiti",
                  "risparmio", "andamentoRisparmio", "andamentoNetto"],
        chiave="risparmio",
    ),
    SchedaFoglio(
        titolo="Patrimonio", intervallo="Patrimonio!A:H",
        campi=["categoria", "capitaleTotale", "capitaleDisponibile", "capitaleInvestito", "capitaleImpegnato",
               "allarmeSoglia", "rimanenteSoglia"],
        intestazioni=["Categoria", "Capitale totale", "Capitale disponibile", "Capitale Investito",
                      "Capitale Impegnato", "Allarme soglia 5000", "Rimanente soglia"],
        numerici=["capitaleTotale", "capitaleDisponibile", "capitaleInvestito", "capitaleImpegnato",
                  "allarmeSoglia", "rimanenteSoglia"],
        chiave="patrimonio",
    ),
    SchedaFoglio(
        titolo="Capitale Impegnato", intervallo="Capitale Impegnato!A:C",
        campi=["categoria", "capitaleImpegnato"], intestazioni=["Categoria", "Capitale Impegnato"],
        numerici=["capitaleImpegnato"],
        chiave="capitaleImpegnato",
    ),
    SchedaFoglio(
        titolo="Rendimenti", intervallo="Rendimenti!A:H",
        campi=["mese", "rendimentoMensileEuro", "rendimentoMensilePerc", "importoMensileInvestito",
               "rendimentoCumulativoEuro", "rendimentoCumulativoPerc", "importoInvestitoCumulato",
               "valoreAttualePortafoglio"],
        intestazioni=["Mese", "Rendimento mensile €", "Rendimento mensile %", "Importo Mensile investito",
                      "Rendimento comulativo €", "Rendimento comulativo %", "Importo Investito", "Somma attuale"],
        numerici=["rendimentoMensileEuro", "rendimentoMensilePerc", "importoMensileInvestito",
                  "rendimentoCumulativoEuro", "rendimentoCumulativoPerc", "importoInvestitoCumulato",
                  "valoreAttualePortafoglio"],
        chiave="rendimentiInvestimenti",
    ),
    # "importoMensileInvestitoe" e "commissioniomulative" sono refusi storici dei
    # nomi dei campi: il frontend li usa così, non vanno corretti solo qui.
    SchedaFoglio(
        titolo="Scalable", intervallo="Scalable!A:ZZ",
        campi=["mese", "rendimentoMensileEuro", "rendimentoMensilePerc", "importoMensileInvestitoe",
               "rendimentoCumulativoEuro", "rendimentoCumulativoPerc", "totaleInvestito", "saldoConto",
               "saldoContoCompleto", "interessiConto", "interessiContoComulativo", "commissioniMensili",
               "commissioniomulative", "dividendi"],
        intestazioni=["Mese", "Rendimento Mensile €", "Rendimento Mensile %", "Importo investito Mensile",
                      "Rendimento comulativo", "Rendimento comulativo %", "Totale investito", "Saldo Conto",
                      "Saldo Conto Completo", "Interessi conto", "Interessi conto comulativo",
                      "Commissioni nel mese", "Commissioni comulative", "Dividendi"],
        numerici=["rendimentoMensileEuro", "rendimentoMensilePerc", "importoMensileInvestitoe",
                  "rendimentoCumulativoEuro", "rendimentoCumulativoPerc", "totaleInvestito", "saldoConto",
                  "saldoContoCompleto", "interessiConto", "interessiContoComulativo", "commissioniMensili",
                  "commissioniomulative", "dividendi"],
        chiave="scalable",
    ),
    SchedaFoglio(
        titolo="Trade Republic", intervallo="Trade Republic!A:ZZ",
        campi=["mese", "rendimentoMensileEuro", "rendimentoMensilePerc", "importoMensileInvestitoe",
               "rendimentoCumulativoEuro", "rendimentoCumulativoPerc", "totaleInvestito", "saldoConto",
               "interessiConto", "savebacks", "commissioniMensili", "commissioniomulative", "dividendiIbonds",
               "dividendiAmundi"],
        intestazioni=["Mese", "Rendimento Mensile €", "Rendimento Mensile %", "Importo investito Mensile",
                      "Rendimento comulativo", "Rendimento comulativo %", "Totale investito", "Saldo Conto",
                      "Interessi conto", "Savebacks", "Commissioni nel mese", "Commissioni comulative",
                      "Dividendi iBonds", "Dividendi Amundi"],
        numerici=["rendimentoMensileEuro", "rendimentoMensilePerc", "importoMensileInvestitoe",
                  "rendimentoCumulativoEuro", "rendimentoCumulativoPerc", "totaleInvestito", "saldoConto",
                  "interessiConto", "savebacks", "commissioniMensili", "commissioniomulative", "dividendiIbonds",
                  "dividendiAmundi"],
        chiave="tradeRepublic",
    ),
    SchedaFoglio(
        titolo="Fondo Pensione", intervallo="Fondo Pensione!A:G",
        campi=["mese", "tfr", "contrBase", "contrVolontaria", "contrAzienda", "totMensile", "totAccumulato"],
        intestazioni=["Mese", "TFR", "Contribuzione base", "Contribuzione volontaria", "Contribuzione azienda",
                      "Totale mensile", "Totale accumulato"],
        numerici=["tfr", "contrBase", "contrVolontaria", "contrAzienda", "totMensile", "totAccumulato"],
        # Sul foglio si scrive solo il TFR: le contribuzioni sono formule sulle
        # percentuali di riga 2, i totali somme.
        formule=["contrBase", "contrVolontaria", "contrAzienda", "totMensile", "totAccumulato"],
        date_mese=["mese"],
        chiave="fondoPensione",
    ),
    SchedaFoglio(
        titolo="Cruscotto", intervallo="Cruscotto!A:L",
        campi=["anno", "azioniInvestitoCum", "azioniInvestitoAnno", "obbligazioniInvestitoCum",
               "obbligazioniInvestitoAnno", "investitoCumulativo", "investitoAnnuale", "rendimentoCumulativoEuro",
               "rendimentoAnnualeEuro", "rendimentoMedioMensilePerc", "rendimentoAnnuoStimatoPerc"],
        intestazioni=["Anno", "Azioni comulativo", "Azioni annuale", "Obbligazioni cumulativo",
                      "Obbligazioni annuale", "Investito cumulativo", "Investito annuale", "Rendimento cumulativo",
                      "Rendimento annuale", "Rendimento % medio", "Rendimento % annuale"],
        numerici=["anno", "azioniInvestitoCum", "azioniInvestitoAnno", "obbligazioniInvestitoCum",
                  "obbligazioniInvestitoAnno", "investitoCumulativo", "investitoAnnuale",
                  "rendimentoCumulativoEuro", "rendimentoAnnualeEuro", "rendimentoMedioMensilePerc",
                  "rendimentoAnnuoStimatoPerc"],
        chiave="cruscottoInvestimenti",
    ),
    SchedaFoglio(
        titolo="Trasferimenti", intervallo="Trasferimenti!A:F",
        campi=["mese", "anno", "categoria", "contoOrdinante", "contoBeneficiario", "importo"],
        intestazioni=["Mese", "Anno", "Categoria", "Conto ordinante", "Conto beneficiario", "Importo"],
        numerici=["anno", "importo"],
        formule=["anno"],
        date_mese=["mese"],
        chiave="trasferimenti",
    ),
    SchedaFoglio(
        titolo="Analisi consumi", intervallo="Analisi consumi!A:P",
        campi=["data", "costo", "quantitaLitri", "prezzoAlLitro", "kmFinali", "kmEffettuati", "litriPrecedenti",
               "kmAlLitro", "kmAlLitroAuto", "euroPer100Km", "litriPer100Km", "kmPersi", "kmPersiMediani",
               "costoExtra", "esitoSettimana", "efficienzaPercentuale"],
        intestazioni=["Data", "Costo", "Quantità (Lt)", "€/Lt", "Km finali", "Km effettuati", "Litri precedenti",
                      "Km/lt", "Km/lt (auto)", "€/100km", "Lt/100km", "Km persi", "km persi mediani",
                      "Costo extra", "Esito settimana", "Efficienza"],
        numerici=["costo", "quantitaLitri", "prezzoAlLitro", "kmFinali", "kmEffettuati", "litriPrecedenti",
                  "kmAlLitro", "kmAlLitroAuto", "euroPer100Km", "litriPer100Km", "kmPersi", "kmPersiMediani",
                  "costoExtra", "efficienzaPercentuale"],
        date=["data"],
        # Calcolate dal foglio: l'app non le ricalcola mai.
        formule=["kmEffettuati", "litriPrecedenti", "kmAlLitro", "euroPer100Km", "litriPer100Km", "kmPersi",
                 "kmPersiMediani", "costoExtra", "esitoSettimana", "efficienzaPercentuale"],
        chiave="analisiConsumi",
    ),
]

# Le schede che arrivano dal foglio di configurazione (Dati Base).
TITOLI_DATI_BASE = [
    "Conti", "Categorie Entrate", "Categorie Uscite", "Soglie", "Preset Uscite Ricorrenti",
    "Preset Trasferimenti Ricorrenti", "Preset Investimenti Ricorrenti", "Preset Fondo Pensione",
]

# Schede che un foglio nuovo creato dall'app riceve vuote. Le altre arrivano
# dal foglio di configurazione o sono facoltative.
SCHEDE_NON_DA_CREARE = [
    "Conti", "Categorie Entrate", "Categorie Uscite", "Preset Uscite Ricorrenti",
    "Preset Trasferimenti Ricorrenti", "Preset Investimenti Ricorrenti", "Preset Fondo Pensione", "Fondo Pensione",
]
SCHEDE_DA_CREARE = [s.titolo for s in SCHEDE if s.titolo not in SCHEDE_NON_DA_CREARE]


def scheda(titolo: str) -> SchedaFoglio | None:
    return next((s for s in SCHEDE if s.titolo == titolo), None)


# Schede dei broker con le colonne degli strumenti, e prefisso delle chiavi
# con cui l'app riceve campi, intestazioni e categorie di quelle colonne.
BROKER = {"Scalable": "scalable", "Trade Republic": "tradeRepublic"}
