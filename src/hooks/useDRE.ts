'use client'
/* ═══════════════════════════════════════════════════════════════
   useDRE — Fase 5.F (ADR-001)

   Consome o endpoint GET /v1/empresas/{id}/dre (entregue nas
   Fases 5.C/5.D/5.E do `grupoalt-api`) como fonte unica do motor
   de calculo do DRE.

   Tipos espelham 1:1 os DTOs Pydantic em
   `grupoalt-api/app/routers/dre.py`:
     - DRESubtotaisOut  -> DRESubtotais
     - NeutroAgregadoOut -> NeutroAgregado
     - DREMetaOut       -> DREMeta
     - PeriodoDREOut    -> PeriodoDRE
     - DREResponse      -> DREResponse

   Quando granularity='total' (default), `subtotais_por_periodo`
   eh `null`. Para outras granularidades, traz 1 DRE por bucket
   ordenado cronologicamente (ordem lexicografica = cronologica
   por design das chaves).
   ═══════════════════════════════════════════════════════════════ */

import { useState, useEffect, useCallback, useRef } from 'react'
import api from '@/lib/api'

// ── Tipos (espelho dos DTOs Pydantic) ───────────────────────────

export type Granularity = 'total' | 'mensal' | 'trimestral' | 'semanal'

/** Os 14 subtotais da cadeia DRE produzidos pelo motor puro
 *  (`grupoalt-api/app/domain/financeiro/dre.py`). */
export interface DRESubtotais {
  RoB: number
  TDCF: number
  RL: number
  CV: number
  MC: number
  CF: number
  EBT1: number
  RNOP: number
  DNOP: number
  SNOP: number
  EBT2: number
  IRPJ: number
  CSLL: number
  RES_LIQ: number
}

export interface NeutroAgregado {
  codigo: string
  nome: string
  total: number
  count: number
}

export interface DREMeta {
  empresa_id: number
  /** ISO date YYYY-MM-DD ou null se nao filtrado */
  dt_inicio: string | null
  /** ISO date YYYY-MM-DD ou null se nao filtrado */
  dt_fim: string | null
  projeto_omie_ids: string[] | null
  granularity: Granularity
  total_lancamentos: number
}

/** Quebra de DRE por bucket temporal (Fase 5.E).
 *
 *  `periodo` segue a granularidade pedida:
 *    - mensal:     "YYYY-MM"     (ex. "2026-04")
 *    - trimestral: "YYYY-Qn"     (ex. "2026-Q2")
 *    - semanal:    "YYYY-Www"    (ex. "2026-W14" -- ISO 8601 week)
 */
export interface PeriodoDRE {
  periodo: string
  subtotais: DRESubtotais
  total_lancamentos: number
}

export interface DREResponse {
  subtotais: DRESubtotais
  neutros: NeutroAgregado[]
  meta: DREMeta
  /** `null` quando granularity='total'; lista (possivelmente vazia)
   *  quando granularity != 'total'. Lista vazia significa "pediu
   *  granularity mas nao ha dados no periodo". */
  subtotais_por_periodo: PeriodoDRE[] | null
}

// ── Parametros do hook ──────────────────────────────────────────

export interface UseDREParams {
  /** ISO date YYYY-MM-DD (opcional, inclusive) */
  dt_inicio?: string
  /** ISO date YYYY-MM-DD (opcional, inclusive) */
  dt_fim?: string
  projeto_omie_ids?: string[]
  granularity?: Granularity
}

interface UseDREResult {
  data: DREResponse | null
  loading: boolean
  error: string | null
  refetch: () => void
}

// ── Hook ────────────────────────────────────────────────────────

/**
 * Busca o DRE consolidado da empresa via endpoint backend.
 *
 * Passe `empresaId=null` para desabilitar (ex: antes de empresa
 * estar resolvida pelo store). Retorna `data=null` enquanto
 * `loading=true`.
 *
 * Datas DEVEM ser ISO YYYY-MM-DD (Pydantic `date` rejeita outros
 * formatos com 422). Para converter de DD/MM/YYYY usado em outras
 * partes do front, use `parseDMY(s).toISOString().slice(0,10)`.
 */
export function useDRE(
  empresaId: number | null,
  params?: UseDREParams,
): UseDREResult {
  const [data, setData] = useState<DREResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Estabiliza params via JSON stringify (mesmo padrao do useApi).
  const paramsKey = JSON.stringify(params ?? {})

  const fetch = useCallback(() => {
    if (!empresaId) {
      setData(null)
      setLoading(false)
      setError(null)
      return
    }

    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    setLoading(true)
    setError(null)

    const cleanParams: Record<string, string | string[]> = {}
    if (params?.dt_inicio) cleanParams.dt_inicio = params.dt_inicio
    if (params?.dt_fim) cleanParams.dt_fim = params.dt_fim
    if (params?.projeto_omie_ids?.length) {
      cleanParams.projeto_omie_ids = params.projeto_omie_ids.map(String)
    }
    if (params?.granularity && params.granularity !== 'total') {
      // Default backend ja eh 'total'; omitir poupa bytes e bate o
      // mesmo cache key (Fase 5.D: granularity='total' == omitido).
      cleanParams.granularity = params.granularity
    }

    api
      .get<DREResponse>(`/empresas/${empresaId}/dre`, {
        params: cleanParams,
        signal: ctrl.signal,
      })
      .then((res) => {
        if (!ctrl.signal.aborted) {
          setData(res.data)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!ctrl.signal.aborted) {
          setError(
            err?.response?.data?.detail || err.message || 'Erro ao carregar DRE',
          )
          setLoading(false)
        }
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId, paramsKey])

  useEffect(() => {
    fetch()
    return () => abortRef.current?.abort()
  }, [fetch])

  return { data, loading, error, refetch: fetch }
}
