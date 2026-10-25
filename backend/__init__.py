"""
Backend di Wally in Python: l'app FastAPI servita da Vercel in api/index.py.

  app.py      crea l'app e registra le rotte
  config.py   variabili d'ambiente
  routes/     gli indirizzi /api/... che chiama il frontend
  services/   chiamate all'esterno (Enable Banking, Google Sheets)
  domain/     logica pura (movimenti; poi investimenti, consumi…)
  models/     forma dei dati (schede del foglio e colonne)
  security/   chi può chiamare le rotte
  tests/      test pytest (npm run test:py)
"""
