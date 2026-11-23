"""
Prova: si può proporre da solo la categoria di un'uscita?

    uv run --with-requirements requirements-dev.txt --with scikit-learn \\
        python -m backend.strumenti.prova_categorie dati.json [AAAA-MM-GG]

Due casi, perché i dati che arrivano sono diversi:
 A. CON TESTO: l'uscita inserita a mano nel form, con la descrizione che scrivi
    tu ("Benzina", "Pranzo Lavoro", "Spritz icocktail").
 B. SENZA TESTO: il movimento di Trade Republic scaricato dalla banca, che ha
    solo data, importo e conto (Trade Republic non manda la causale).

Come si misura: i modelli imparano dalle uscite fino a 6 mesi fa e indovinano
la categoria di quelle degli ultimi 6 mesi, come succederebbe davvero.
"Giusta" = la prima proposta è quella scelta; "tra le prime 3" = sarebbe
bastato toccare uno dei tre suggerimenti. Restano fuori PAC, trasferimenti e
correttivi (macro "Movimenti"/"correttivo"): li gestiscono già le regole.
"""
import json
import sys
from collections import Counter, defaultdict
from datetime import date

import numpy as np

from backend.domain.previsioni.serie import data_da_testo

MESI_PROVA = 6
ESCLUSE = {"Movimenti", "correttivo"}


def uscite_utili(dati: dict) -> list[dict]:
    """Le uscite con data e categoria, senza PAC, trasferimenti e correttivi,
    in ordine di data e con solo i campi che servono alla prova.
    """
    righe = []
    for u in dati.get("uscite") or []:
        d = data_da_testo(u.get("data"))
        if not d or not u.get("categoria") or u.get("macroCategoria") in ESCLUSE:
            continue
        righe.append({"data": d, "descrizione": str(u.get("descrizione") or "").strip(), "conto": u.get("conto") or "",
                      "importo": abs(float(u.get("importo") or 0)), "categoria": u["categoria"], "macro": u.get("macroCategoria") or ""})
    return sorted(righe, key=lambda r: r["data"])


def _numeri(r: dict) -> list[float]:
    """Cosa si sa di un movimento senza descrizione."""
    i = r["importo"]
    return [np.log1p(i), i, round(i % 1, 2), float(i == round(i)), r["data"].weekday(), r["data"].day]


def prova(dati: dict, oggi: date) -> None:
    """Prova i modi di indovinare la categoria e stampa quanto ci prendono.

    Imparano dalle uscite fino a 6 mesi fa e indovinano quelle degli ultimi 6.
    Due casi: con la descrizione scritta a mano, e senza (solo importo, giorno
    e conto, come i movimenti di Trade Republic).
    """
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.linear_model import LogisticRegression
    from sklearn.pipeline import make_pipeline
    from sklearn.preprocessing import OneHotEncoder

    righe = uscite_utili(dati)
    taglio = date(oggi.year - (1 if oggi.month <= MESI_PROVA else 0), (oggi.month - MESI_PROVA - 1) % 12 + 1, 1)
    allena = [r for r in righe if r["data"] < taglio]
    verifica = [r for r in righe if r["data"] >= taglio]
    print(f"Imparano da {len(allena)} uscite (fino al {taglio:%d/%m/%Y}), indovinano le {len(verifica)} dopo.\n")

    def punteggio(nome: str, proposte: list[list[str]], campo: str):
        """Stampa la quota di proposte giuste al primo colpo e tra le prime 3."""
        vere = [r[campo] for r in verifica]
        giusta = np.mean([p[:1] == [v] for p, v in zip(proposte, vere)])
        top3 = np.mean([v in p[:3] for p, v in zip(proposte, vere)])
        print(f"  {nome:58} giusta {giusta:5.0%}   tra le prime 3 {top3:5.0%}")

    def classi_ordinate(modello, X) -> list[list[str]]:
        """Per ogni uscita, le categorie dalla più probabile alla meno probabile."""
        prob = modello.predict_proba(X)
        return [list(modello.classes_[np.argsort(-p)]) for p in prob]

    for campo, titolo in (("categoria", "CATEGORIA"), ("macro", "MACRO CATEGORIA")):
        print(f"{titolo} ({len({r[campo] for r in righe})} possibili)")
        piu_frequenti = [c for c, _ in Counter(r[campo] for r in allena).most_common()]

        print(" A. con la descrizione scritta a mano")
        # Regola semplice: la stessa descrizione ha avuto più spesso questa categoria
        per_testo: dict[str, Counter] = defaultdict(Counter)
        for r in allena:
            per_testo[r["descrizione"].lower()][r[campo]] += 1
        proposte = []
        for r in verifica:
            visti = [c for c, _ in per_testo[r["descrizione"].lower()].most_common()]
            proposte.append(visti + [c for c in piu_frequenti if c not in visti])
        punteggio("regola: stessa descrizione → categoria più usata", proposte, campo)

        testo = make_pipeline(TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 4), lowercase=True, sublinear_tf=True),
                              LogisticRegression(max_iter=2000, C=10))
        testo.fit([r["descrizione"] for r in allena], [r[campo] for r in allena])
        punteggio("ML: pezzi di parole (TF-IDF) + regressione logistica", classi_ordinate(testo, [r["descrizione"] for r in verifica]), campo)

        # Testo + importo + conto: si uniscono le probabilità dei due modelli
        conto = OneHotEncoder(handle_unknown="ignore").fit([[r["conto"]] for r in allena])
        def misto(rs):
            """Descrizione, conto e importo messi insieme come numeri per il modello."""
            from scipy.sparse import hstack
            return hstack([testo[0].transform([r["descrizione"] for r in rs]),
                           conto.transform([[r["conto"]] for r in rs]),
                           np.array([[np.log1p(r["importo"])] for r in rs])]).tocsr()
        tutto = LogisticRegression(max_iter=3000, C=10).fit(misto(allena), [r[campo] for r in allena])
        punteggio("ML: descrizione + importo + conto", classi_ordinate(tutto, misto(verifica)), campo)

        print(" B. senza descrizione (solo importo, giorno e conto, come Trade Republic)")
        punteggio("regola: sempre le categorie più frequenti", [piu_frequenti] * len(verifica), campo)
        X = lambda rs: np.hstack([np.array([_numeri(r) for r in rs]), conto.transform([[r["conto"]] for r in rs]).toarray()])
        bosco = RandomForestClassifier(n_estimators=300, min_samples_leaf=2, random_state=0).fit(X(allena), [r[campo] for r in allena])
        punteggio("ML: random forest su importo, centesimi, giorno, conto", classi_ordinate(bosco, X(verifica)), campo)
        print()


if __name__ == "__main__":
    dati = json.load(open(sys.argv[1], encoding="utf-8"))
    prova(dati, date.fromisoformat(sys.argv[2]) if len(sys.argv) > 2 else date.today())
