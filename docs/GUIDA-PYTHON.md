# Guida a Python (per questo progetto)

Non è una guida generale a Python: spiega solo quello che compare nel backend di Wally, con esempi presi dai file veri. Le cose sono in ordine di quanto spesso le incontri.

Per sapere **quale file fa cosa** c'è [BACKEND.md](./BACKEND.md). Questa guida serve a **leggere le righe** dentro i file.

## 0. Tre trucchi di VS Code

- **Mouse sopra il nome di una funzione**: compare la sua spiegazione (il testo fra `"""` sotto la riga `def`), ovunque la funzione sia usata.
- **F12** (o Cmd+clic) sul nome: salta a dove è scritta la funzione.
- **Shift+F12**: mostra tutti i punti dove è usata.

Le funzioni delle previsioni (`backend/domain/previsioni/`) hanno tutte una spiegazione con *Riceve*, *Restituisce* ed *Esempio*.

---

## 1. Come è fatta una funzione

```python
def indice_mese(anno: int, mese: int) -> int:
    """Trasforma anno e mese in un numero solo, per fare i conti con i mesi.

    Esempio: indice_mese(2026, 11) → 24322 (2026 × 12 + 11 - 1).
    """
    return anno * 12 + mese - 1
```

| Pezzo | Cosa vuol dire |
|---|---|
| `def indice_mese(...)` | qui inizia una funzione che si chiama `indice_mese` |
| `anno: int, mese: int` | riceve due valori; `: int` dice che sono numeri interi |
| `-> int` | restituisce un numero intero |
| `"""..."""` | la spiegazione (docstring): non viene eseguita, serve a chi legge |
| `return ...` | il risultato; la funzione finisce qui |

Il **rientro** (4 spazi) è quello che dice cosa sta dentro la funzione, dentro un `if` o dentro un `for`. Non ci sono parentesi graffe come in TypeScript: quando il rientro torna indietro, il blocco è finito.

### I tipi più comuni

| Scritto così | Vuol dire |
|---|---|
| `int`, `float`, `str`, `bool` | numero intero, numero con virgola, testo, vero/falso |
| `list[dict]` | una lista di dizionari (es. le righe di una scheda) |
| `dict[int, float]` | un dizionario con chiavi numeri interi e valori numeri (es. `{24322: 1600.0}`) |
| `set[str]` | un insieme di testi, senza doppioni (es. `{"Rifornimento", "Spesa"}`) |
| `tuple[int, int]` | una coppia fissa di valori (es. `(2026, 11)`) |
| `date` | una data (`date(2026, 11, 23)`) |
| `np.ndarray` | un array di numpy (vedi §8) |
| `X \| None` | un X, **oppure niente**. Es. `int \| None` = un numero o `None` |

I tipi non cambiano cosa fa il codice: servono all'editor per avvisarti degli errori e a te per capire cosa entra e cosa esce.

### `None`

`None` è "niente", come `null` / `undefined` in TypeScript. Le funzioni lo restituiscono quando non hanno un risultato:

```python
def mese_da_nome(nome) -> int | None:
    ...
mese_da_nome("ottobre")  # → 10
mese_da_nome("xx")       # → None
```

### Funzioni con `_` davanti

`_quantili`, `_rifornimenti`, `_stima`: il trattino basso vuol dire "**di uso interno**", da usare solo in questo file. Python non lo impedisce, è una convenzione.

---

## 2. Dizionari e `.get(...)`

Le righe del foglio arrivano dall'app come **dizionari**: coppie chiave → valore, come gli oggetti JSON.

```python
riga = {"data": "23/11/2026", "importo": 29.4, "categoria": "Rifornimento", "primaria": True}
riga["importo"]          # → 29.4
riga.get("importo")      # → 29.4
riga.get("descrizione")  # → None   (la chiave non c'è: niente errore)
riga["descrizione"]      # → ERRORE KeyError
```

Per questo nel codice trovi quasi sempre `.get(...)`: se una colonna manca, il programma non si ferma.

Con un secondo valore, `.get` restituisce quello quando la chiave non c'è:

```python
per_mese.get(m, 0.0)   # quanto c'è per il mese m, o 0 se ancora niente
```

---

## 3. `x or valore` — "se è vuoto, usa quest'altro"

```python
for r in righe or []:
str(t.get("descrizione") or "").strip()
```

`a or b` dà `a` se `a` "c'è", altrimenti `b`. Per Python **non ci sono**: `None`, `0`, `""`, `[]`, `{}`.

- `righe or []`: se `righe` è `None`, usa una lista vuota (così il `for` non dà errore).
- `t.get("descrizione") or ""`: se la descrizione manca, usa un testo vuoto.

La combinazione che trovi ovunque:

```python
str(t.get("categoria") or "").strip().lower()
```

si legge da dentro verso fuori: prendi la categoria → se non c'è usa `""` → fanne un testo → togli gli spazi ai lati (`strip`) → tutto minuscolo (`lower`). Serve a confrontare testi senza badare a spazi e maiuscole.

---

## 4. `a if condizione else b` — un `if` su una riga

```python
tasso = (r["entrate"] - r["spese"]) / r["entrate"] if r["entrate"] else None
```

È come il `condizione ? a : b` di TypeScript, ma con l'ordine diverso: **prima il valore se vero**, poi la condizione, poi il valore se falso. Qui: "il tasso di risparmio, se ci sono entrate; altrimenti niente" (per non dividere per zero).

---

## 5. f-string — testo con dentro dei valori

```python
f"{anno}-{mese:02d}"                        # → "2026-03"
f"Servono almeno {MESI_MINIMI} mesi chiusi"  # → "Servono almeno 6 mesi chiusi"
```

La `f` davanti alle virgolette permette di mettere valori fra `{ }`. Dopo i due punti c'è il formato: `:02d` = intero su 2 cifre con lo zero davanti.

---

## 6. Liste "compresse" (comprehension)

È la cosa che rende il codice più denso. Una riga così:

```python
chiusi = [r for r in righe if r["mese"] < corrente]
```

vuol dire esattamente:

```python
chiusi = []
for r in righe:
    if r["mese"] < corrente:
        chiusi.append(r)
```

Si legge: "**le `r`**, per ogni `r` in `righe`, **se** il mese è prima di quello corrente". Prima cosa si mette nella lista, poi da dove si prende, poi (se c'è) il filtro.

Altre forme che trovi:

```python
[r["spese"] for r in chiusi]                    # solo le spese di ogni riga
{c for c, n in conteggi.items() if n >= 2}      # un insieme (graffe, un valore)
{k: round(v, 2) for k, v in cumulato.items()}   # un dizionario (graffe, chiave: valore)
```

### `sum(...)`, `any(...)`, `max(...)` con dentro un `for`

```python
sum(t["importo"] for t in di_questo_mese if t["primaria"])
```

"La somma degli importi delle uscite di questo mese che sono primarie." Stessa idea con `any` (almeno una?), `all` (tutte?), `max`, `min`.

---

## 7. Cicli: `enumerate`, `zip`, `.items()`, scomposizione

```python
for i, t in enumerate(uscite):      # i = posizione (0, 1, 2…), t = l'uscita
for k, v in cumulato.items():       # k = chiave, v = valore di un dizionario
for s, n in zip(spesa, volte):      # due liste in parallelo: 1° con 1°, 2° con 2°…
```

**Scomposizione**: quando una funzione restituisce più valori insieme, si possono prendere in una volta:

```python
anno, mese = anno_e_mese(24322)          # anno = 2026, mese = 11
basso, centrale, alto = np.percentile(valori, [10, 50, 90])
anno, m = divmod(mese, 12)               # divmod = (divisione intera, resto)
```

### Fette di liste

```python
mesi[-12:]    # gli ultimi 12
mesi[:p]      # i primi p (dal primo fino a p escluso)
v[recenti]    # con numpy anche: le posizioni dentro "recenti"
```

---

## 8. numpy (`np.`)

`numpy` lavora su **array**: liste di numeri su cui le operazioni si fanno tutte insieme, senza `for`.

```python
spese = np.array([700, 800, 900])
spese + 100          # → [800, 900, 1000]      (a ognuno)
spese > 750          # → [False, True, True]
np.mean(spese > 750) # → 0.67  (la quota di "veri": 2 su 3)
```

Quest'ultima riga è il modo in cui `fine_mese.py` calcola la **probabilità di superare una soglia**: la quota di scenari sopra il limite.

Le funzioni che trovi più spesso:

| Funzione | Cosa fa |
|---|---|
| `np.mean`, `np.median` | media, mediana |
| `np.std(x, ddof=1)` | deviazione standard (quanto ballano i valori) |
| `np.percentile(x, [10, 50, 90])` | 10°, 50° e 90° percentile: basso, centrale, alto |
| `np.maximum(x, 0)` | ogni valore, ma non sotto zero |
| `np.cumsum(x)` | somme progressive: `[1, 2, 3]` → `[1, 3, 6]` |
| `np.zeros(12)`, `np.full(n, v)` | array di 12 zeri, di n volte v |
| `rng.normal(media, dev, forma)` | numeri casuali (usati nella simulazione del patrimonio) |

In `patrimonio.py` gli array hanno **due dimensioni** (`forma = (SCENARI, mesi)`: 2.000 righe, una per futuro simulato, e una colonna per mese). `avanzo[:, m]` vuol dire "la colonna del mese m, per tutti i futuri".

---

## 9. Funzioni dentro funzioni

```python
def previsione_fine_mese(uscite, preset_uscite, ...):
    ...
    def variabili(mese, primaria=None):
        return [t for t in per_mese[mese] if ...]
    ...
    var_prim = np.array([variabile_dopo(m, giorno, True) for m in passati])
```

Una funzione scritta **dentro** un'altra esiste solo lì dentro, e vede le sue variabili (`per_mese`, `preset`, `giorni_mese`…) senza bisogno di passargliele. Si usa per pezzi di calcolo che servono solo a quella funzione. Anche queste hanno la loro spiegazione.

### `lambda` — una funzione di una riga, senza nome

```python
puliti.sort(key=lambda r: (r["data"], r["km"]))
```

`lambda r: (r["data"], r["km"])` è una funzione che riceve `r` e restituisce data e km. Qui dice a `sort` **in base a cosa ordinare**: prima per data, a parità di data per km.

---

## 10. Valori di default e argomenti per nome

```python
def previsioni_flussi(risparmio, oggi, uscite=None, entrate=None, orizzonte=12, preset_uscite=None):
```

`orizzonte=12` vuol dire: se chi chiama non lo dice, vale 12. Chiamando si può dare un argomento per nome, in qualunque ordine:

```python
previsioni_flussi(dati.get("risparmio"), oggi, dati.get("uscite"), dati.get("entrate"),
                  preset_uscite=dati.get("presetUscite"))
```

### `**` — "spacchetta il dizionario qui"

```python
attivo = {**c, "evento": evento, "dal": evento + 1}
```

Un nuovo dizionario con tutte le chiavi di `c` più `evento` e `dal`. È lo `{...c, evento}` di TypeScript.

---

## 11. Classi e `@dataclass`

```python
@dataclass
class Rendimento:
    medio: float       # % annuo
    volatilita: float  # % annua

r = Rendimento(6.5, 15.0)
r.medio   # → 6.5
```

`@dataclass` crea una "scheda" con dei campi, come un `interface` di TypeScript che si può anche costruire. Le righe con `@` sopra una funzione o classe si chiamano **decoratori**: aggiungono un comportamento. Altri che trovi:

- `@router.get("/dati")` (in `routes/`): "questa funzione risponde all'indirizzo `/api/.../dati`". FastAPI la chiama da solo quando arriva la richiesta.
- `@classmethod`: una funzione della classe che crea un oggetto, es. `Ipotesi.da_dizionario({...})`.

`class RichiestaElabora(BaseModel)` (in `routes/`): un modello **pydantic**. Descrive il JSON che il browser deve mandare; se manca un campo o ha il tipo sbagliato, FastAPI risponde con un errore da solo.

`__call__` (in `auto.py`, `_Contachilometri`): permette di usare l'oggetto come una funzione, `conta(una_data)`.

---

## 12. Errori: `try` / `except` / `raise`

```python
try:
    return date(2000 + a if a < 100 else a, int(m), int(g))
except (ValueError, TypeError):
    return None
```

"Prova a costruire la data; se il testo non era una data valida, restituisci `None` invece di fermarti." `raise ErroreScrittura("...")` fa il contrario: **ferma** l'operazione con un messaggio, che la rotta trasforma in una risposta di errore per l'app.

---

## 13. `import`

```python
from datetime import date
import numpy as np
from backend.domain.previsioni.serie import chiave_mese, indice_mese
```

- `from X import a, b`: prendi `a` e `b` dal file/libreria `X`.
- `import numpy as np`: usa la libreria numpy chiamandola `np`.
- `backend.domain.previsioni.serie` è il file `backend/domain/previsioni/serie.py` (i punti sono le cartelle).

Le costanti in MAIUSCOLO (`MESI_INDIETRO = 12`, `SOGLIA_STRAORDINARIA = 1000.0`) sono valori fissi da cambiare solo lì: in cima al file o in `backend/models/`.

---

## Esempio completo: `serie_risparmio`

Da `backend/domain/previsioni/serie.py`, con il significato di ogni riga:

```python
def serie_risparmio(righe: list[dict], oggi: date) -> list[dict]:
    corrente = indice_mese(oggi.year, oggi.month)        # il mese di oggi come numero (24322)
    per_mese: dict[int, dict] = {}                        # qui raccolgo un risultato per mese
    for r in righe or []:                                 # per ogni riga di Risparmio (se non ce ne sono, nessuna)
        indice = mese_da_testo(r.get("mese"), r.get("anno"))   # "ottobre" + 2026 → 24321
        if indice is None or indice > corrente:           # mese illeggibile o nel futuro:
            continue                                      #   salta alla riga dopo
        entrate, spese = numero(r.get("entrate")), numero(r.get("speseTotali"))
        if not entrate and not spese:                     # riga tutta a zero: salta
            continue
        per_mese[indice] = {"mese": indice, "entrate": entrate, "spese": spese, ...}
    return [per_mese[k] for k in sorted(per_mese)]        # i risultati in ordine di mese
```

L'ultima riga è una lista compressa (§6): "il risultato di ogni mese `k`, prendendo i mesi in ordine".
