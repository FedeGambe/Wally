"""
Previsioni sui dati finti per la demo pubblicata, che non ha backend.

    npm run previsioni:demo

Legge da stdin i dati demo (frontend/scripts/esporta-dati-demo.ts) e scrive
frontend/src/data/demoPrevisioni.json. La data è fissa, a metà dell'ultimo mese
dei dati demo, così il file cambia solo se cambiano i dati demo.
"""
import json
import sys
from datetime import date
from pathlib import Path

from backend.domain.previsioni import calcola_previsioni
from backend.domain.previsioni.patrimonio import Ipotesi

OGGI_DEMO = date(2026, 6, 18)
DESTINAZIONE = Path(__file__).resolve().parents[2] / "frontend" / "src" / "data" / "demoPrevisioni.json"


def main() -> None:
    dati = json.load(sys.stdin)
    ipotesi = Ipotesi().come_dizionario() | {"obiettivo": 50000}
    risultato = calcola_previsioni(dati, OGGI_DEMO, ipotesi)
    DESTINAZIONE.write_text(json.dumps(risultato, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"Scritto {DESTINAZIONE.relative_to(Path.cwd())}")


if __name__ == "__main__":
    main()
