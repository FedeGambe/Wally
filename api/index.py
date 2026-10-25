"""
Unica funzione Vercel di Wally: serve l'app FastAPI di backend/app.py.
vercel.json riscrive ogni /api/... verso questo file, e FastAPI sceglie la
rotta guardando il percorso originale.
"""
import os
import sys

# Rende importabile il pacchetto `backend`, che sta nella cartella principale.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app import app  # noqa: E402

__all__ = ["app"]
