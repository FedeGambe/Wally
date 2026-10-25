#!/bin/sh
# npm run dev: avvia insieme il backend Python (porta 8000) e il frontend
# (porta 3000, che inoltra /api al backend). Ctrl+C li spegne tutti e due.
# Solo il frontend: npm run dev:frontend. Solo il backend: npm run api.

npm run api &
BACKEND=$!

ferma() {
  trap - INT TERM EXIT
  # uvicorn --reload lancia un processo figlio: si spegne tutto il gruppo.
  pkill -P "$BACKEND" 2>/dev/null
  kill "$BACKEND" 2>/dev/null
  for pid in $(lsof -ti :8000 2>/dev/null); do kill "$pid" 2>/dev/null; done
}
trap ferma INT TERM EXIT

npm --prefix frontend run dev
