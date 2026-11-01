"""
L'app del backend: tutte le rotte /api/* di Wally.

Su Vercel la serve api/index.py (vercel.json manda lì ogni /api/...).
In locale: `npm run api`, e Vite inoltra /api a questa app.
"""
from fastapi import FastAPI

from backend.routes import banca, fogli, previsioni, scritture

app = FastAPI(title="Wally", docs_url="/api/docs", openapi_url="/api/openapi.json", redoc_url=None)
app.include_router(banca.router)
app.include_router(fogli.router)
app.include_router(scritture.router)
app.include_router(previsioni.router)
