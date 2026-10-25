# Prossimi aggiornamenti

Idee e lavori decisi ma non ancora fatti. Quando un punto è finito si toglie da qui (la storia resta nei commit).

---

## 1. Categorizzare i movimenti di Trade Republic da Telegram

**Problema.** Le spese con la carta Trade Republic finiscono tutte nella card "Dalla banca" da confermare a mano. Trade Republic passa solo data, importo e segno, senza esercente né causale, quindi le regole non possono categorizzarle da sole.

**Idea.** Quando la sincronizzazione trova un movimento nuovo che le regole non riconoscono, un bot Telegram manda un messaggio con le categorie come pulsanti. Tocchi la categoria e l'uscita viene registrata nel foglio senza aprire Wally.

```
💳 Trade Republic · −12,40 € · sab 11 ott
[Spesa] [Ristoranti] [Trasporti] [Svago]
[Altro ▸]                        [Salta]
```

### Flusso

1. `sincronizza` in `backend/routes/banca.py` scarica i movimenti come oggi e poi li classifica con `classifica` (`backend/domain/classificazione.py`), come fa già `/api/banca/elabora`.
2. Per ogni movimento ancora "da confermare" su Trade Republic manda un messaggio Telegram (`sendMessage` con `inline_keyboard`). L'ID del movimento va nel `callback_data`.
3. Una nuova rotta `backend/routes/telegram.py` riceve i tocchi tramite webhook:
   - **categoria**: scrive l'uscita nel foglio (conto Trade Republic, data con `dataProbabile`, importo del movimento, Secondaria come in Aggiungi Uscita), segna il movimento come registrato nella colonna `Stato` di "Movimenti Banca" e modifica il messaggio in "✓ Registrata in Ristoranti";
   - **Altro ▸**: mostra le altre categorie o le macro categorie;
   - **Salta**: lascia `Stato` vuoto, così il movimento resta nella card "Dalla banca" dell'app.
4. Facoltativo: se rispondi al messaggio con un testo ("pizza con Luca"), diventa la descrizione dell'uscita.

### Da fare nel codice

- [ ] `backend/services/telegram.py`: `invia_messaggio`, `modifica_messaggio`, `rispondi_callback` (chiamate dirette alle Bot API con `requests`, nessuna libreria).
- [x] Scrittura dell'uscita lato server: c'è già (`scritture.aggiungi_riga` in `backend/services/scritture.py`, usata anche da `/api/banca/elabora`); con il cron va chiamata con `GoogleSheets.service_account()`.
- [ ] Le categorie per i pulsanti si leggono dal foglio Dati Base, così restano allineate all'app.
- [ ] La sincronizzazione deve mandare il messaggio una volta sola per movimento. Serve uno stato come `notificato` nella colonna `Stato`, oppure una colonna nuova.
- [ ] L'app considera gestiti i movimenti registrati da Telegram (`frontend/src/hooks/useMovimentiBanca.ts`).
- [ ] Test del pezzo puro (costruzione della tastiera e della riga uscita).

### Sicurezza

- Il webhook si registra con `secret_token`: la rotta Telegram rifiuta le richieste senza l'header `X-Telegram-Bot-Api-Secret-Token` giusto.
- Si accettano solo messaggi e tocchi da `TELEGRAM_CHAT_ID`, cioè la tua chat.

### Configurazione (da fare a mano)

1. Su Telegram, @BotFather → `/newbot` → copia il token.
2. Scrivi un messaggio qualsiasi al bot e recupera il tuo chat id da `https://api.telegram.org/bot<TOKEN>/getUpdates`.
3. Su Vercel aggiungi le variabili `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` e `TELEGRAM_WEBHOOK_SECRET` (`openssl rand -hex 32`), poi documentale in `.env.example`.
4. Registra il webhook una volta:
   `https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://wally.federicogamberini.it/api/telegram&secret_token=<SECRET>`

### Limiti da sapere

- **Non è in tempo reale.** Il piano Hobby di Vercel permette un cron solo una volta al giorno (adesso alle 4:00 UTC). Per avere più giri si può usare un cron esterno gratuito (es. cron-job.org) che chiama `GET /api/banca/sincronizza` con `Authorization: Bearer <CRON_SECRET>`. PSD2 permette circa **4 letture al giorno per conto** senza l'utente presente, quindi al massimo 4 giri al giorno (es. 8, 13, 18, 22).
- **Non c'è il nome del negozio.** Il messaggio mostra solo importo e data, quindi più presto arriva più è facile ricordarsi cos'era.
- **Timeout di Trade Republic.** A volte risponde con un 408: il movimento arriva al giro successivo.

---

## Altri punti aperti

- [ ] **Consensi bancari in scadenza.** Trade Republic scade l'8/1/2027 (massimo 90 giorni), UniCredit l'8/4/2027. Si rinnovano da Impostazioni → Banche collegate. Si può aggiungere un avviso, anche su Telegram, qualche giorno prima della scadenza.
- [ ] **Sviluppo in locale.** Senza `VITE_GOOGLE_OAUTH_CLIENT_ID` in `.env.local` il token Google scade dopo un'ora e l'app fa logout.
- [ ] **Collegamento banca solo in produzione.** Il redirect di Enable Banking punta al dominio di produzione, quindi in locale non si può collegare una banca.
