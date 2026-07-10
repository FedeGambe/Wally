import React from 'react';

/**
 * Componente tabella generica e riutilizzabile (usato nelle varie pagine/subview
 * per mostrare elenchi di movimenti, conti, ecc.). È "generico" in senso TypeScript:
 * il tipo `T` rappresenta la riga di dati (es. una Transaction), e chi usa il
 * componente decide come renderizzare ogni colonna passando delle funzioni `render`.
 * Non contiene logica di business: si limita a disegnare `<table>` a partire da
 * `columns` (definizione delle colonne) e `data` (righe).
 */

interface Column<T> {
  header: string;
  align?: 'left' | 'right';
  className?: string;
  // Funzione che, data la riga e il suo indice, restituisce cosa mostrare nella cella.
  // Questo permette a chi usa <DataTable> di personalizzare il contenuto (testo, icone, badge...)
  // senza che il componente debba conoscere la struttura esatta dei dati.
  render: (row: T, idx: number) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  // Funzione opzionale per generare una "key" React stabile per ogni riga
  // (utile quando l'indice dell'array non basta, es. dopo un filtro/ordinamento).
  // Se non viene passata si usa l'indice come fallback.
  keyExtractor?: (row: T, idx: number) => React.Key;
}

export default function DataTable<T>({ columns, data, keyExtractor }: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse table-fixed">
        <thead>
          <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            {columns.map((col, i) => (
              <th key={i} className={`py-3 px-4 ${col.align === 'right' ? 'text-right' : ''} ${i > 0 ? 'w-36' : ''}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50 text-xs">
          {data.map((row, idx) => (
            <tr key={keyExtractor ? keyExtractor(row, idx) : idx} className="hover:bg-slate-50/60 transition-colors">
              {columns.map((col, i) => (
                <td key={i} className={`py-3.5 px-4 ${col.align === 'right' ? 'text-right' : ''} ${col.className || ''}`}>
                  {col.render(row, idx)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
