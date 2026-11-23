"""
Soglie con storico: ogni riga della scheda "Soglie" vale da un mese in poi
(colonna "Dal", "2026-11"). Senza data vale da sempre. Così, cambiando una
soglia, i mesi passati restano misurati con quella che valeva allora.

Per un mese, ogni categoria prende la versione più recente con "Dal" uguale o
precedente a quel mese. Se il mese viene prima di tutte le versioni, vale la
più vecchia.
"""
import re

from backend.domain.conversioni import numero_localizzato
from backend.domain.cruscotto import leggi_mese

_DATA_GMA = re.compile(r"^(\d{1,2})/(\d{1,2})/(\d{2,4})$")
_DATA_AMG = re.compile(r"^(\d{4})-(\d{1,2})-(\d{1,2})")


def dal_da_testo(valore) -> str:
    """"2026-11", "01/11/2026", "2026-11-01" o "Novembre 2026" → "2026-11"; "" se vuoto o illeggibile."""
    testo = str(valore or "").strip()
    if not testo:
        return ""
    # Una data intera (Sheets converte "2026-11-01" e mostra "01/11/2026"): giorno/mese/anno.
    if m := _DATA_GMA.match(testo):
        anno, mese = int(m[3]), int(m[2])
        letto = (2000 + anno if anno < 100 else anno, mese)
    elif m := _DATA_AMG.match(testo):
        letto = (int(m[1]), int(m[2]))
    else:
        letto = leggi_mese(testo)
    if letto and not 1 <= letto[1] <= 12:
        return ""
    return f"{letto[0]}-{letto[1]:02d}" if letto else ""


def soglie_del_mese(soglie: list[dict] | None, anno: int, mese: int) -> list[dict]:
    """Una soglia per categoria: quella che valeva nel mese dato (mese 1-12).

    Riceve: tutte le versioni delle soglie (con o senza "dal") e anno e mese.
    Restituisce: per ogni categoria la versione più recente con "dal" uguale o
    prima di quel mese; se il mese viene prima di tutte, la più vecchia.
    Esempio: Spese Primarie 50% da sempre e 35% dal 2026-04
      marzo 2026 → 50%     novembre 2026 → 35%
    """
    chiave = f"{anno}-{mese:02d}"
    valide: dict[str, dict] = {}
    piu_vecchie: dict[str, dict] = {}
    for s in soglie or []:
        nome = str(s.get("categoria") or "").strip().lower()
        if not nome:
            continue
        dal = str(s.get("dal") or "")
        if nome not in piu_vecchie or dal < str(piu_vecchie[nome].get("dal") or ""):
            piu_vecchie[nome] = s
        if dal <= chiave and (nome not in valide or dal >= str(valide[nome].get("dal") or "")):
            valide[nome] = s
    return [valide.get(nome, s) for nome, s in piu_vecchie.items()]


# --- Scheda "Soglie": una riga per periodo -----------------------------------
#
#   Dal            | Spese Primarie | Spese Secondarie | Risparmio | Investimenti
#   settembre 2025 | 50%            | 20%              | 15%       | 15%
#   aprile 2026    | 35%            | 15%              | 25%       | 25%
#
# "Dal" è una data vera (il primo del mese), così le formule del foglio
# principale possono cercare la riga valida in un mese. Vuota = da sempre.
# Si legge anche il vecchio formato, una riga per categoria (Categoria |
# Percentuale | Dal).

def _percentuale(valore) -> float | None:
    """La percentuale di una cella, sempre come numero da 0 a 100.

    Esempi: "35%" → 35 · 0,35 → 35 · 35 → 35 · cella vuota → None
    """
    if valore is None or str(valore).strip() == "":
        return None
    n = float(numero_localizzato(valore))
    if "%" in str(valore):
        return n
    return n * 100 if 0 < n <= 1 else n


def soglie_da_righe(righe: list[list]) -> list[dict]:
    """Le righe della scheda Soglie come elenco di versioni.

    Riceve: le righe della scheda (riga 1 = intestazioni).
    Restituisce: [{categoria, percentuale, dal?}, ...]. Una categoria che resta
    uguale al periodo prima non crea una versione nuova. Legge sia il formato
    a periodi (una riga per "Dal") sia quello vecchio (una riga per categoria).
    Esempio:
      Dal            | Spese Primarie | Spese Secondarie
      settembre 2025 | 50%            | 20%
      aprile 2026    | 35%            | 20%
      → Primarie 50 dal 2025-09, Secondarie 20 dal 2025-09, Primarie 35 dal 2026-04
        (le Secondarie di aprile sono uguali: niente versione nuova)
    """
    if not righe or len(righe) < 2:
        return []
    intestazioni = [str(c or "").strip() for c in righe[0]]
    if intestazioni and intestazioni[0].lower() == "categoria":
        return _soglie_per_categoria(intestazioni, righe[1:])

    periodi = []
    for riga in righe[1:]:
        if not any(str(c or "").strip() for c in riga):
            continue
        dal = dal_da_testo(riga[0] if riga else "")
        valori = {}
        for i, nome in enumerate(intestazioni[1:], start=1):
            p = _percentuale(riga[i] if i < len(riga) else None)
            if nome and p is not None:
                valori[nome] = p
        if valori:
            periodi.append((dal, valori))
    periodi.sort(key=lambda x: x[0])

    soglie, ultime = [], {}
    for dal, valori in periodi:
        for nome, p in valori.items():
            if ultime.get(nome) == p:
                continue
            ultime[nome] = p
            soglia = {"categoria": nome, "percentuale": p}
            if dal:
                soglia["dal"] = dal
            soglie.append(soglia)
    return soglie


def _soglie_per_categoria(intestazioni: list[str], righe: list[list]) -> list[dict]:
    """Il formato vecchio della scheda Soglie: una riga per categoria
    (Categoria | Percentuale | Dal). Restituisce le stesse versioni di soglie_da_righe.
    """
    basse = [h.lower() for h in intestazioni]
    i_perc = basse.index("percentuale") if "percentuale" in basse else 1
    i_dal = basse.index("dal") if "dal" in basse else 2
    soglie = []
    for riga in righe:
        categoria = str(riga[0] if riga else "").strip()
        p = _percentuale(riga[i_perc] if i_perc < len(riga) else None)
        if not categoria:
            continue
        soglia = {"categoria": categoria, "percentuale": p or 0}
        dal = dal_da_testo(riga[i_dal] if i_dal < len(riga) else "")
        if dal:
            soglia["dal"] = dal
        soglie.append(soglia)
    return soglie


def matrice_soglie(soglie: list[dict] | None) -> list[list]:
    """Il contrario di soglie_da_righe: le versioni come righe da scrivere sul foglio.

    Restituisce: riga 1 = "Dal" + categorie, poi una riga per ogni mese in cui
    cambia qualcosa, con tutte le categorie valide allora. Percentuali come
    frazione (35 → 0,35), "Dal" come data del primo del mese.
    Esempio: Primarie 50 da sempre e 35 dal 2026-04
      → [["Dal", "Spese Primarie"], ["", 0.5], ["2026-04-01", 0.35]]
    """
    soglie = [s for s in soglie or [] if str(s.get("categoria") or "").strip()]
    categorie = list(dict.fromkeys(str(s["categoria"]).strip() for s in soglie))
    date = sorted({str(s.get("dal") or "") for s in soglie})
    righe = [["Dal", *categorie]]
    for dal in date:
        anno, mese = (int(x) for x in dal.split("-")) if dal else (0, 1)
        valide = {str(s["categoria"]).strip(): s for s in soglie_del_mese(soglie, anno, mese)}
        righe.append([f"{dal}-01" if dal else "",
                      *(round(float(valide[c].get("percentuale") or 0) / 100, 6) for c in categorie)])
    return righe
