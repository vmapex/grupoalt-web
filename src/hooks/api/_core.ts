'use client'
/* ═══════════════════════════════════════════════════════════════
   Infra base dos hooks de API.
   Padrão: { data, loading, error, refetch }
   ═══════════════════════════════════════════════════════════════ */

import { useState, useEffect, useCallback, useRef } from 'react'
import api from '@/lib/api'
import type { PaginatedResponseAPI } from '@/lib/types'

export interface UseApiResult<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export type ApiParamValue = string | number | string[] | number[] | undefined

/** Limpa params removendo undefined/null/empty e preservando arrays (repeat
 *  format que FastAPI consome em `Query(List[...])`). */
export function buildCleanParams(
  params?: Record<string, ApiParamValue>,
): Record<string, string | string[]> {
  const cleanParams: Record<string, string | string[]> = {}
  if (!params) return cleanParams
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue
    if (Array.isArray(v)) {
      const arr = v.map(String).filter(Boolean)
      if (arr.length > 0) cleanParams[k] = arr
    } else {
      cleanParams[k] = String(v)
    }
  }
  return cleanParams
}

export function useApi<T>(
  url: string | null,
  params?: Record<string, ApiParamValue>,
): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const fetch = useCallback(() => {
    if (!url) return
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    setLoading(true)
    setError(null)

    const cleanParams = buildCleanParams(params)

    api
      .get<T>(url, { params: cleanParams, signal: ctrl.signal })
      .then((res) => {
        if (!ctrl.signal.aborted) {
          setData(res.data)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!ctrl.signal.aborted) {
          setError(err?.response?.data?.detail || err.message || 'Erro ao carregar')
          setLoading(false)
        }
      })
  }, [url, JSON.stringify(params)])

  useEffect(() => {
    fetch()
    return () => abortRef.current?.abort()
  }, [fetch])

  return { data, loading, error, refetch: fetch }
}

/** Cap atual do backend (`Query(registros: int, le=1000)` em
 *  `app/routers/cp_cr.py`). Exportado para visibilidade nos testes. */
export const PAGINATED_ALL_PAGE_SIZE = 1000

/** Pagina ate esgotar e concatena `dados`. Funcao pura para facilitar
 *  testes — `useApiPaginatedAll` apenas cuida do ciclo React em volta.
 *
 *  ADR-002: preserva `sync_pending`/`sync_status` da PRIMEIRA pagina pro
 *  consumer detectar e montar SyncProgress. Quando o backend dispara
 *  sync por DB vazio, `dados` esta vazio e o break interrompe o loop
 *  na primeira iteracao — os campos ja foram capturados. */
export async function fetchAllPages(
  fetcher: (pagina: number, registros: number) => Promise<PaginatedResponseAPI>,
): Promise<PaginatedResponseAPI> {
  const allDados: PaginatedResponseAPI['dados'] = []
  let pagina = 1
  let totalPaginas = 1
  let totalRegistros = 0
  let syncPending: boolean | null | undefined
  let syncStatus: PaginatedResponseAPI['sync_status']

  while (pagina <= totalPaginas) {
    const res = await fetcher(pagina, PAGINATED_ALL_PAGE_SIZE)
    if (pagina === 1) {
      syncPending = res.sync_pending
      syncStatus = res.sync_status
    }
    allDados.push(...res.dados)
    totalPaginas = res.paginas || 1
    totalRegistros = res.total
    // Defesa: se o backend retornar pagina vazia antes do esperado,
    // nao entra em loop infinito.
    if (res.dados.length === 0) break
    pagina += 1
  }

  return {
    total: totalRegistros,
    pagina: 1,
    registros: allDados.length,
    paginas: 1,
    dados: allDados,
    sync_pending: syncPending,
    sync_status: syncStatus,
  }
}

/** Pagina automaticamente um endpoint que retorna `PaginatedResponseAPI`
 *  ate esgotar todas as paginas. Usado para KPIs/breakdowns que precisam
 *  do conjunto completo de lancamentos (Step 13 — Parte C). */
export function useApiPaginatedAll(
  url: string | null,
  params?: Record<string, ApiParamValue>,
): UseApiResult<PaginatedResponseAPI> {
  const [data, setData] = useState<PaginatedResponseAPI | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const fetch = useCallback(() => {
    if (!url) return
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    setLoading(true)
    setError(null)

    const baseParams = buildCleanParams(params)

    fetchAllPages(async (pagina, registros) => {
      const res = await api.get<PaginatedResponseAPI>(url, {
        params: { ...baseParams, pagina: String(pagina), registros: String(registros) },
        signal: ctrl.signal,
      })
      return res.data
    })
      .then((merged) => {
        if (!ctrl.signal.aborted) {
          setData(merged)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!ctrl.signal.aborted) {
          setError(err?.response?.data?.detail || err.message || 'Erro ao carregar')
          setLoading(false)
        }
      })
  }, [url, JSON.stringify(params)])

  useEffect(() => {
    fetch()
    return () => abortRef.current?.abort()
  }, [fetch])

  return { data, loading, error, refetch: fetch }
}
