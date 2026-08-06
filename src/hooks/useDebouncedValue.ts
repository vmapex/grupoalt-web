'use client'
/* Debounce de valor controlado — a busca das tabelas grandes (CP/CR,
   Extrato) re-filtrava milhares de linhas E re-renderizava a tabela
   inteira a CADA tecla. O input continua controlado pelo valor cru;
   o filtro consome o valor debounced. */
import { useEffect, useState } from 'react'

export function useDebouncedValue<T>(value: T, delayMs = 250): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(id)
  }, [value, delayMs])

  return debounced
}
