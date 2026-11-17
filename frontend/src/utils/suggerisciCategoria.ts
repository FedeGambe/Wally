/**
 * Suggerimenti di categoria per una nuova uscita, imparati dalle uscite già
 * registrate. Nessuna libreria e nessun server: gira nel browser, anche nella
 * demo e in incognito. Propone e basta, la scelta resta all'utente.
 *
 * Due modelli, a seconda di cosa si sa:
 *  - CON DESCRIZIONE ("Benzina", "Pranzo Lavoro"): Naive Bayes sui pezzi di
 *    parola (2-4 lettere, così "rifornim" e "rifornimento" si somigliano),
 *    con più peso alle uscite recenti (dimezza ogni 2 anni). Solo se almeno
 *    metà dei pezzi è già stata vista; altrimenti vale il caso sotto.
 *  - SENZA DESCRIZIONE, o con una mai vista (i movimenti Trade Republic, che arrivano dalla banca
 *    solo con data, importo e conto): i 30 "vicini", cioè le uscite passate
 *    più simili per importo, centesimi, conto e giorno feriale/festivo, pesate
 *    per somiglianza e recenza (dimezza ogni 6 mesi).
 *
 * Provati sui dati veri (backend/strumenti/prova_categorie.py, la stessa prova
 * rifatta su questi due modelli): imparando dalle uscite fino a maggio 2026 e
 * indovinando le 221 dopo, con la descrizione la categoria giusta è la prima
 * 2 volte su 3 e tra le prime tre 3 volte su 4; senza descrizione è la prima
 * 1 volta su 2. PAC, trasferimenti e correttivi restano fuori: li gestiscono
 * già i preset e le regole della banca.
 */

export interface UscitaNota {
  data: string;            // GG/MM/AAAA, come nel foglio
  descrizione: string;
  macroCategoria: string;
  categoria: string;
  conto: string;
  importo: number;
}

export interface NuovaUscita {
  descrizione: string;
  importo: number;
  conto: string;
  data: Date;
}

export interface Suggerimento {
  macroCategoria: string;
  categoria: string;
  /** Peso relativo fra 0 e 1 (somma 1 sui suggerimenti considerati). */
  probabilita: number;
}

const MACRO_ESCLUSE = new Set(['movimenti', 'correttivo']);
const GIORNO = 86_400_000;
const EMIVITA_TESTO_ANNI = 2;
const EMIVITA_VICINI_ANNI = 0.5;
const VICINI = 30;
const ALFA = 0.3; // lisciatura del Naive Bayes: un pezzo mai visto non azzera una categoria
/** Quota minima di pezzi (da 3-4 lettere) già visti perché il testo decida:
 *  sotto, la descrizione non somiglia a niente e il Naive Bayes proporrebbe a
 *  caso le categorie più rare. Si passa allora a importo, conto e giorno. */
const PEZZI_NOTI_MINIMI = 0.5;

interface Esempio {
  chiave: string;
  macro: string;
  categoria: string;
  pezzi: string[];
  importo: number;
  logImporto: number;
  centesimi: number;
  conto: string;
  festivo: boolean;
  quando: number;
}

const leggiData = (testo: string): Date | null => {
  const [g, m, a] = String(testo || '').split('/').map(Number);
  return g && m && a ? new Date(a, m - 1, g) : null;
};

const centesimiDi = (importo: number) => Math.round((importo % 1) * 100);
const festivoDi = (d: Date) => d.getDay() === 0 || d.getDay() === 6;
const peso = (quando: number, oggi: number, emivitaAnni: number) => 0.5 ** ((oggi - quando) / GIORNO / 365 / emivitaAnni);

/** "Caffè Bar!" → pezzi di 2-4 lettere di ogni parola, senza accenti e punteggiatura. */
export function pezziDiParola(testo: string): string[] {
  const parole = testo.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ').split(' ').filter(Boolean);
  const pezzi: string[] = [];
  for (const p of parole) {
    const w = ` ${p} `;
    for (let n = 2; n <= 4; n++) for (let i = 0; i + n <= w.length; i++) pezzi.push(w.slice(i, i + n));
  }
  return pezzi;
}

/**
 * Prepara i due modelli dalle uscite registrate (una volta, è veloce anche
 * con migliaia di righe) e restituisce la funzione che suggerisce.
 */
export function creaSuggeritore(uscite: UscitaNota[], oggi: Date = new Date()) {
  const adesso = oggi.getTime();
  const esempi: Esempio[] = [];
  for (const u of uscite) {
    const d = leggiData(u.data);
    const importo = Math.abs(Number(u.importo) || 0);
    if (!d || !u.categoria || !u.macroCategoria || MACRO_ESCLUSE.has(u.macroCategoria.toLowerCase()) || d.getTime() > adesso) continue;
    esempi.push({
      chiave: `${u.macroCategoria}\u0000${u.categoria}`, macro: u.macroCategoria, categoria: u.categoria,
      pezzi: pezziDiParola(u.descrizione || ''), importo, logImporto: Math.log1p(importo), centesimi: centesimiDi(importo),
      conto: u.conto, festivo: festivoDi(d), quando: d.getTime(),
    });
  }

  // Naive Bayes: per ogni categoria quanto pesa ogni pezzo di parola.
  const priori = new Map<string, number>();
  const conteggi = new Map<string, Map<string, number>>();
  const totali = new Map<string, number>();
  const vocabolario = new Set<string>();
  const nomi = new Map<string, { macro: string; categoria: string }>();
  for (const e of esempi) {
    const w = peso(e.quando, adesso, EMIVITA_TESTO_ANNI);
    nomi.set(e.chiave, { macro: e.macro, categoria: e.categoria });
    priori.set(e.chiave, (priori.get(e.chiave) ?? 0) + w);
    const c = conteggi.get(e.chiave) ?? new Map<string, number>();
    for (const p of e.pezzi) {
      c.set(p, (c.get(p) ?? 0) + w);
      vocabolario.add(p);
    }
    conteggi.set(e.chiave, c);
    totali.set(e.chiave, (totali.get(e.chiave) ?? 0) + w * e.pezzi.length);
  }
  const sommaPriori = [...priori.values()].reduce((s, v) => s + v, 0);
  const V = vocabolario.size || 1;

  const testoRiconosciuto = (descrizione: string) => {
    const lunghi = pezziDiParola(descrizione).filter(p => p.length >= 3);
    return lunghi.length > 0 && lunghi.filter(p => vocabolario.has(p)).length / lunghi.length >= PEZZI_NOTI_MINIMI;
  };

  const perTesto = (descrizione: string): Map<string, number> => {
    const pezzi = pezziDiParola(descrizione);
    const log = new Map<string, number>();
    for (const [chiave, prior] of priori) {
      const c = conteggi.get(chiave)!;
      const den = (totali.get(chiave) ?? 0) + ALFA * V;
      let v = Math.log(prior / sommaPriori);
      for (const p of pezzi) v += Math.log(((c.get(p) ?? 0) + ALFA) / den);
      log.set(chiave, v);
    }
    const max = Math.max(...log.values());
    return new Map([...log].map(([k, v]) => [k, Math.exp(v - max)]));
  };

  const perNumeri = (u: NuovaUscita): Map<string, number> => {
    const importo = Math.abs(u.importo);
    const logImporto = Math.log1p(importo);
    const centesimi = centesimiDi(importo);
    const festivo = festivoDi(u.data);
    const distanze = esempi.map(e => ({
      e,
      d: Math.abs(e.logImporto - logImporto) * 3
        + (e.centesimi === centesimi ? 0 : 0.5)
        + (e.conto === u.conto ? 0 : 1)
        + (e.festivo === festivo ? 0 : 0.3),
    })).sort((a, b) => a.d - b.d).slice(0, VICINI);
    const punti = new Map<string, number>();
    for (const { e, d } of distanze) {
      punti.set(e.chiave, (punti.get(e.chiave) ?? 0) + peso(e.quando, adesso, EMIVITA_VICINI_ANNI) / (0.1 + d) ** 2);
    }
    return punti;
  };

  /**
   * Le `quante` categorie più probabili. `valida` (opzionale) scarta quelle che
   * non esistono più nella configurazione (Impostazioni → Dati Base).
   */
  return function suggerisci(u: NuovaUscita, quante = 3, valida?: (macro: string, categoria: string) => boolean): Suggerimento[] {
    if (!esempi.length) return [];
    const punti = testoRiconosciuto(u.descrizione) ? perTesto(u.descrizione)
      : u.importo > 0 ? perNumeri(u) : new Map<string, number>();
    const elenco = [...punti]
      .map(([chiave, v]) => ({ ...nomi.get(chiave)!, v }))
      .filter(x => !valida || valida(x.macro, x.categoria));
    const somma = elenco.reduce((s, x) => s + x.v, 0) || 1;
    return elenco.sort((a, b) => b.v - a.v).slice(0, quante)
      .map(x => ({ macroCategoria: x.macro, categoria: x.categoria, probabilita: x.v / somma }));
  };
}
