"""Variabili d'ambiente del backend (elenco completo in .env.example)."""
import os


def env(nome: str) -> str:
    valore = os.environ.get(nome)
    if not valore:
        raise RuntimeError(f"Variabile d'ambiente mancante: {nome}")
    return valore


def chiave_pem(valore: str) -> str:
    """Su Vercel i ritorni a capo di una chiave incollata come variabile possono
    arrivare come "\\n" letterali: li ripristiniamo prima di firmare."""
    return valore.replace("\\n", "\n")
