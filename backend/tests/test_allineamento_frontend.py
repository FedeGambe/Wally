"""
Le due piccole cose che esistono sia nel frontend sia nel backend:
 - il nome di campo delle colonne strumento (toValidFieldName ↔ nome_campo):
   il backend crea i campi in lettura, investimentiRicorrenti.ts li ritrova;
 - le intestazioni predefinite della scheda Risparmio.
Se una delle due copie cambia da sola, questo test fallisce.
"""
import json
import subprocess
from pathlib import Path

import pytest

from backend.domain.righe import nome_campo
from backend.models.foglio import scheda

FRONTEND = Path(__file__).resolve().parents[2] / "frontend"
TSX = FRONTEND / "node_modules" / ".bin" / "tsx"

INTESTAZIONI = ["2029 Corp Bond", "Vanguard FTSE All-World", "Azioni & Bond", "Liquidità", "S&P 500 +",
                "MSCI World SRI", "Eur Overnight Rt Swap", "iShares Core €-Govt", ""]


@pytest.mark.skipif(not TSX.exists(), reason="serve frontend/node_modules (npm install)")
def test_frontend_e_backend_allineati():
    script = (
        "import { toValidFieldName } from './src/utils/sheetsUtils';"
        "import { INTESTAZIONI_RISPARMIO } from './src/config/sheetsConfig';"
        f"const nomi = {json.dumps(INTESTAZIONI)};"
        "console.log(JSON.stringify({ campi: nomi.map(toValidFieldName), risparmio: INTESTAZIONI_RISPARMIO }))"
    )
    uscita = subprocess.run([str(TSX), "--eval", script], cwd=FRONTEND, capture_output=True, text=True, check=True)
    frontend = json.loads(uscita.stdout)
    assert frontend["campi"] == [nome_campo(h) for h in INTESTAZIONI]
    assert frontend["risparmio"] == scheda("Risparmio").intestazioni
