/**
 * Lato app delle previsioni (pagina Previsioni). I calcoli stanno nel backend
 * Python (backend/domain/previsioni/): qui ci sono solo i tipi della risposta
 * e la chiamata. L'app manda i dati che ha già in memoria, quindi in modalità
 * incognito le previsioni sono fatte sui dati finti.
 */
import { chiamaBackend } from './backend';

/** Una stima: valore centrale e fascia in cui cade 8 volte su 10. */
export interface Stima {
  basso: number;
  centrale: number;
  alto: number;
}

export interface Rendimento {
  medio: number;       // % annuo
  volatilita: number;  // % annua
}

export interface IpotesiPrevisioni {
  anni: number;
  risparmioExtra: number;    // € al mese in più che restano sui conti
  pacExtra: number;          // € al mese in più negli investimenti
  crescitaEntrate: number;   // % all'anno
  inflazione: number;        // % all'anno; 0 = cifre nominali
  includiFondoPensione: boolean; // TFR dentro la proiezione (di default no: non si usa fino alla pensione)
  obiettivo: number | null;
  rendimenti: Record<'azioni' | 'obbligazioni' | 'monetari' | 'fondoPensione', Rendimento>;
}

export type NonDisponibile = { disponibile: false; motivo: string };

export type PuntoCurva = { giorno: number; speso?: number } & Partial<Stima>;

export interface FineMese {
  disponibile: true;
  mese: string;          // "2026-10"
  giorno: number;
  giorniMese: number;
  spesoFinora: { primarie: number; secondarie: number; totale: number };
  fissiInArrivo: { nome: string; importo: number; giorno: number; primaria?: boolean }[];
  stima: { totale: Stima; primarie: Stima; secondarie: Stima };
  entrateMese: number;
  /** true se nelle entrate c'è lo stipendio mediano (quello del mese non è ancora registrato). */
  entrateStimate: boolean;
  stipendioMediano?: number | null;
  /** "Spese Totali" (soglia = primarie + secondarie), "Spese Primarie", "Spese Secondarie". */
  soglie: { nome: string; percentuale: number; limite: number | null; probabilitaSforamento: number | null }[];
  curva: PuntoCurva[];
  curve?: { totale: PuntoCurva[]; primarie: PuntoCurva[]; secondarie: PuntoCurva[] };
  affidabilita: { erroreMedio: number; mesiProvati: number };
  mesiUsati: number;
  /** Primarie frequenti (es. Rifornimento) stimate per giorno della settimana: i giorni
   *  in cui di solito si spende, che quota della spesa ci cade e quanti ne restano nel mese. */
  perGiornoSettimana?: { categoria: string; giorni: string[]; quotaNeiGiorni: number; giorniRestanti: number }[];
}

export interface VoceStraordinaria {
  tipo: 'uscita' | 'entrata';
  mese: string;
  data: string | null;
  descrizione: string;
  importo: number;
}

export interface Flussi {
  disponibile: true;
  /** Mesi passati SENZA le voci straordinarie (sono a parte, negli ultimi due campi). */
  storico: { mese: string; entrate: number; spese: number; avanzo: number; straordinarieEntrate: number; straordinarieUscite: number }[];
  stipendio: {
    periodo: { nome: string; dal: string; mesi: number };
    tipico: number;
    resaExtra: number;
    mensilitaExtra: { mese: string; nome: string; importo: number; frazione: number }[];
  } | null;
  straordinarie: VoceStraordinaria[];
  previsti: {
    mese: string; entrate: Stima; spese: Stima; avanzo: Stima; avanzoCumulato: Stima;
    /** Di cui primarie frequenti (es. rifornimento), stimate dai giorni della settimana del mese. */
    primarieFrequenti?: number;
    /** Sabati del mese. */
    weekend?: number;
  }[];
  /** Le categorie primarie stimate per giorno della settimana (es. Rifornimento). */
  categorieFrequenti?: string[];
  affidabilita: Record<'entrate' | 'spese' | 'avanzo', { erroreMedio: number | null; mesiProvati: number }>;
  mesiUsati: number;
}

export interface MeseStorico {
  mese: string;
  inCorso: boolean;
  risparmio: number;
  versamenti: number;
  mercato: number;
  fondoPensione: number;
  cumulato: { risparmio: number; versamenti: number; mercato: number; fondoPensione: number };
  tassoRisparmio: number | null;
  tassoRisparmio12: number | null;
}

/** Come si divide il patrimonio: quota (0-1) e importo di ogni parte. */
export type Ripartizione = Record<'liquidita' | 'investimenti' | 'fondoPensione', { quota: number; importo: number }>;

export interface PuntoProiezione {
  mese: string;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  soloVersamenti: number;
  ripartizione: Ripartizione;
}

export interface Patrimonio {
  disponibile: true;
  storico: {
    mesi: MeseStorico[];
    ultimi12: { risparmio: number; versamenti: number; mercato: number; fondoPensione: number; totale: number };
  };
  oggi: {
    totale: number; liquidita: number; investimenti: number; fondoPensione: number; impegnato: number;
    liquiditaLibera: number; speseMedieMensili: number; mesiAutonomia: number | null; anniDiSpese: number | null;
  };
  allocazione: { azioni: number; obbligazioni: number; monetari: number };
  proiezione: {
    punti: PuntoProiezione[];
    scenari: number;
    partenza: number;        // patrimonio da cui parte la proiezione (senza fondo pensione se escluso)
    ripartizioneOggi: Ripartizione;
    fondoIncluso: boolean;
    pacMensile: number;
    pacNonCoperto: { probabilita: number; meseProbabile: string | null };
    fondoMensile: number;
    avanzoMedioMensile: number;
    obiettivo?: {
      importo: number;
      perAnno: { anno: number; probabilita: number }[];
      meseProbabile: string | null;
      giaRaggiunto: boolean;
    };
  };
  ipotesi: IpotesiPrevisioni;
}

/** D. Auto (backend/domain/previsioni/auto.py): km dei prossimi 12 mesi; il costo
 *  del carburante lo calcola l'app con il prezzo scelto (km / kmAlLitro × prezzo). */
export interface Auto {
  disponibile: true;
  ultimoRifornimento: string; // "2026-11-15"
  giorniUsati: number;
  kmAlGiorno: number;
  kmAnno: Stima;
  contachilometri: { oggi: number; traUnAnno: number };
  kmMeseFinora: number;
  kmAlLitro: number;
  prezzo: { attuale: number; minimoAnno: number | null; massimoAnno: number | null; medioAnno: number | null };
  rateFisse: { mensile: number; voci: { nome: string; importo: number }[] };
  storico: { mese: string; km: number; carburante: number }[];
  previsti: { mese: string; km: Stima }[];
  affidabilita: { erroreMedio: number | null; prove: number; giorni: number };
  rifornimenti: number;
}

export interface RispostaPrevisioni {
  oggi: string;
  fineMese: FineMese | NonDisponibile;
  flussi: Flussi | NonDisponibile;
  patrimonio: Patrimonio | NonDisponibile;
  /** Manca nelle previsioni demo calcolate prima che ci fosse. */
  auto?: Auto | NonDisponibile;
}

export const IPOTESI_PREDEFINITE: IpotesiPrevisioni = {
  anni: 20,
  risparmioExtra: 0,
  pacExtra: 0,
  crescitaEntrate: 0,
  inflazione: 0,
  includiFondoPensione: false,
  obiettivo: null,
  rendimenti: {
    azioni: { medio: 6.5, volatilita: 15 },
    obbligazioni: { medio: 2.5, volatilita: 5 },
    monetari: { medio: 2, volatilita: 0.5 },
    fondoPensione: { medio: 3.5, volatilita: 6 },
  },
};

/** Le sole parti dei dati che servono alle previsioni. */
export const CHIAVI_DATI = [
  'risparmio', 'uscite', 'entrate', 'presetUscite', 'presetInvestimenti', 'soglie', 'patrimonio',
  'capitaleImpegnato', 'rendimentiInvestimenti', 'fondoPensione', 'cruscottoInvestimenti', 'analisiConsumi',
] as const;

export const chiediPrevisioni = (accessToken: string, dati: Record<string, unknown>, ipotesi: IpotesiPrevisioni) =>
  chiamaBackend<RispostaPrevisioni>('previsioni', accessToken, { metodo: 'POST', corpo: { dati, ipotesi } });
