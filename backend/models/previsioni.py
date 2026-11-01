"""
Fatti della vita che le previsioni non possono indovinare dai numeri.
Si cambiano solo qui.

CAMBI_STIPENDIO: quando è cambiato il lavoro. Lo stipendio arriva il mese
dopo (assunto a marzo 2026 → primo stipendio ad aprile), quindi per stimarlo
si usano i mesi dal mese DOPO l'ultimo cambio. `mensilita_extra` dice se in
quel periodo si prendono tredicesima e quattordicesima.

MENSILITA_EXTRA: mese di pagamento → nome e mesi che matura (contati
all'indietro dal mese di pagamento). Il primo anno vale solo per i mesi
lavorati: a luglio 2026 la quattordicesima era per marzo-giugno (4/12).

SOGLIA_STRAORDINARIA: una singola voce da questa cifra in su (l'auto, i
regali dei nonni per l'auto) non è una spesa o un'entrata "normale": resta
fuori dalle stime e compare nell'elenco delle voci escluse.
"""

CATEGORIA_STIPENDIO = "Stipendio"

CAMBI_STIPENDIO = [
    {"mese": "2025-09", "nome": "Inizio tirocinio", "mensilita_extra": False},
    {"mese": "2026-03", "nome": "Assunzione", "mensilita_extra": True},
]

# mese di pagamento: (nome, primo mese maturato, ultimo mese maturato), in mesi prima del pagamento
MENSILITA_EXTRA = {
    12: ("Tredicesima", 11, 0),     # gennaio-dicembre, pagata a dicembre
    7: ("Quattordicesima", 12, 1),  # luglio-giugno, pagata a luglio
}

SOGLIA_STRAORDINARIA = 1000.0
