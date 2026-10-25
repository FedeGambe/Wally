/**
 * Lato app della sincronizzazione bancaria. Tutto passa dal backend Python
 * (backend/routes/banca.py): il cron e "Sincronizza ora" scaricano i movimenti
 * nella scheda "Movimenti Banca" del foglio Finanza; da qui Wally li legge,
 * segna nella colonna "Stato" quelli registrati o scartati, legge i conti
 * collegati da "Banca Collegamenti" (foglio di configurazione) e avvia il
 * collegamento di una banca. Letture e Stato usano il token dell'utente.
 */
import { chiamaBackend } from './backend';
import type { PresetUscita, PresetTrasferimento, PresetInvestimento } from '../config/datiBaseSeed';

/** Un movimento scaricato dalla banca (backend/domain/movimenti.py). */
export interface MovimentoBanca {
  id: string;
  conto: string;        // nome del conto in Wally (es. 'Unicredit')
  data: string;         // YYYY-MM-DD (data di contabilizzazione)
  importo: number;      // con segno: negativo = uscita
  descrizione: string;  // causale ripulita, '' se la banca non la fornisce
}

/** Cosa registrare per un movimento riconosciuto (backend/domain/classificazione.py). */
export type PropostaBanca =
  | { tipo: 'preset'; nome: string }
  // Un lato può restare '' quando la banca non dice dove sono andati i soldi:
  // lo sceglie l'utente.
  | { tipo: 'trasferimento'; contoOrdinante: string; contoBeneficiario: string; categoria?: string }
  | { tipo: 'entrata'; categoria: string }
  | { tipo: 'uscita'; macroCategoria: string; categoria: string }
  | { tipo: 'investimento'; broker: string };

export const STATO_REGISTRATO = 'Registrato';
export const STATO_IGNORATO = 'Ignorato';

export interface RigaMovimentoBanca extends MovimentoBanca {
  riga: number;   // numero di riga nel foglio (1 = intestazioni)
  stato: string;  // '' = ancora da gestire
}

/** Un movimento della lista "Da confermare", con i suggerimenti per il modulo. */
export interface MovimentoDaConfermare {
  movimento: RigaMovimentoBanca;
  esito: 'da-confermare';
  proposta?: PropostaBanca;
  regola?: string;             // nome della regola che l'ha riconosciuto
  riga: number;
  giaInserito?: string;        // spesa inserita a mano che sembra già questa (es. "Spesa del 10/10")
  dataProbabile: string;       // data del pagamento (Trade Republic contabilizza il giorno dopo)
  descrizioneBreve: string;    // la parte della causale dopo "PER", '' se non c'è
  contoNellaCausale?: string;  // altro conto di Wally nominato nella causale
}

export interface CollegamentoBanca {
  banca: string;
  scadenza: string;   // YYYY-MM-DD
  iban: string;
  contoWally: string;
}

// Banche collegabili da Impostazioni (nome esatto in Enable Banking).
export const BANCHE_COLLEGABILI = [
  { banca: 'UniCredit', paese: 'IT' },
  { banca: 'Trade Republic', paese: 'IT' }
];

export const segnaMovimentiBanca = async (
  accessToken: string,
  spreadsheetId: string,
  aggiornamenti: { riga: number; stato: string }[]
): Promise<void> => {
  if (aggiornamenti.length === 0) return;
  await chiamaBackend('banca/movimenti/stato', accessToken, { metodo: 'POST', corpo: { foglio: spreadsheetId, aggiornamenti } });
};

/**
 * Classifica i movimenti ancora da gestire con le regole e i Dati Base
 * dell'app. Con `registra` (dopo un pull riuscito) il backend prima registra
 * da solo quelli riconosciuti con certezza (preset, giri tra conti, PAC) e ne
 * segna lo Stato. `errore`: registrazione interrotta a metà (quello prima è
 * già scritto e segnato).
 */
export const elaboraMovimentiBanca = (
  accessToken: string,
  spreadsheetId: string,
  input: {
    registra: boolean;
    conti: string[];
    contiCollegati: string[];
    presetUscite: PresetUscita[];
    presetTrasferimenti: PresetTrasferimento[];
    presetInvestimenti: PresetInvestimento[];
    macroCategorieUscite: { nome: string; icon: string; categorie: string[] }[];
  }
): Promise<{ daConfermare: MovimentoDaConfermare[]; registrati: string[]; errore: string | null }> =>
  chiamaBackend('banca/elabora', accessToken, { metodo: 'POST', corpo: { foglio: spreadsheetId, ...input } });

export const leggiCollegamentiBanca = async (accessToken: string, configSpreadsheetId: string): Promise<CollegamentoBanca[]> =>
  (await chiamaBackend<{ collegamenti: CollegamentoBanca[] }>(`banca/collegamenti?foglio=${encodeURIComponent(configSpreadsheetId)}`, accessToken)).collegamenti;

const chiamaApiBanca = async (percorso: string, accessToken: string, body?: unknown): Promise<any> => {
  const res = await fetch(`/api/banca/${percorso}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {})
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.errore || `Richiesta a /api/banca/${percorso} non riuscita (${res.status})`);
  return json;
};

/** Avvia il collegamento (o rinnovo) e ritorna l'indirizzo della banca su cui mandare l'utente. */
export const avviaCollegamentoBanca = async (accessToken: string, banca: string, paese: string): Promise<string> =>
  (await chiamaApiBanca('collega', accessToken, { banca, paese })).url;

export const sincronizzaBancaOra = async (accessToken: string): Promise<{ aggiunti: number; scaduti: string[]; errori: string[] }> =>
  chiamaApiBanca('sincronizza', accessToken);

/** Giorni che mancano alla scadenza del consenso (negativo = già scaduto). */
export const giorniAllaScadenza = (scadenza: string, oggi = new Date()): number =>
  Math.ceil((Date.parse(scadenza) - Date.parse(oggi.toISOString().slice(0, 10))) / 86400_000);
