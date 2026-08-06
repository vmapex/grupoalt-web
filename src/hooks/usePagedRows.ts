'use client'
/* ═══════════════════════════════════════════════════════════════
   Paginação client-side de linhas JÁ carregadas (perf de tabela).

   Contexto (2026-08-06): CP/CR e Extrato buscam o período inteiro de
   propósito (Step 13 — KPIs/gráficos/IA precisam do dado completo, sem
   truncamento silencioso), mas renderizavam TODAS as linhas no DOM —
   milhares de <tr> deixavam as telas pesadas. Este hook fatia só o que
   vai pro DOM; os agregados continuam lendo o array completo.

   A página reseta quando `rows` muda de identidade (novo filtro, nova
   busca, novo sort — todos produzem array novo via useMemo).
   ═══════════════════════════════════════════════════════════════ */
import { useEffect, useMemo, useState } from 'react'

export interface PagedRows<T> {
  /** Fatia da página corrente — só isso vai pro DOM. */
  paged: T[]
  /** Página corrente (0-based), já clampada ao total. */
  page: number
  totalPages: number
  /** Total de linhas do conjunto completo (pro rodapé "N itens"). */
  total: number
  setPage: (p: number) => void
}

export const PAGE_SIZE_DEFAULT = 100

export function usePagedRows<T>(rows: T[], pageSize: number = PAGE_SIZE_DEFAULT): PagedRows<T> {
  const [page, setPage] = useState(0)

  useEffect(() => {
    setPage(0)
  }, [rows])

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize))
  const safePage = Math.min(page, totalPages - 1)

  const paged = useMemo(
    () => rows.slice(safePage * pageSize, (safePage + 1) * pageSize),
    [rows, safePage, pageSize],
  )

  return { paged, page: safePage, totalPages, total: rows.length, setPage }
}
