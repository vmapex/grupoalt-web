'use client'
/* ═══════════════════════════════════════════════════════════════
   Hooks de API — Conecta frontend aos endpoints FastAPI
   Padrão: { data, loading, error, refetch }
   Fallback: mock data quando API falha (apenas em dev)
   ═══════════════════════════════════════════════════════════════ */

import { useState, useEffect, useCallback, useRef } from 'react'
import api from '@/lib/api'
import type {
  ExtratoAPI,
  ExtratoResponseAPI,
  SaldoAPI,
  PaginatedResponseAPI,
  ResumoKPIsAPI,
  FluxoCaixaAPI,
  ConcilDiaAPI,
  ConcilResumoAPI,
  ConcilMovimentoAPI,
  ConcilDiaDetalheAPI,
  NotificacaoAPI,
} from '@/lib/types'

// ── Generic fetch hook ────────────────────────────────────────

interface UseApiResult<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => void
}

function useApi<T>(
  url: string | null,
  params?: Record<string, string | number | undefined>,
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

    const cleanParams: Record<string, string> = {}
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && v !== '') {
          cleanParams[k] = String(v)
        }
      }
    }

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

// ── Extrato ───────────────────────────────────────────────────

export function useExtrato(empresaId: number | null, dtInicio?: string, dtFim?: string) {
  return useApi<ExtratoResponseAPI>(
    empresaId ? `/empresas/${empresaId}/extrato` : null,
    { dt_inicio: dtInicio, dt_fim: dtFim, refresh: 'true' },
  )
}

// ── Saldos por conta ──────────────────────────────────────────

export function useSaldos(empresaId: number | null, dtInicio?: string, dtFim?: string) {
  return useApi<SaldoAPI[]>(
    empresaId ? `/empresas/${empresaId}/saldos` : null,
    { dt_inicio: dtInicio, dt_fim: dtFim },
  )
}

// ── CP (Contas a Pagar) ──────────────────────────────────────

export function useCP(
  empresaId: number | null,
  opts?: { status?: string; pagina?: number; registros?: number; favorecido?: string; dtInicio?: string; dtFim?: string },
) {
  return useApi<PaginatedResponseAPI>(
    empresaId ? `/empresas/${empresaId}/cp` : null,
    { status: opts?.status, pagina: opts?.pagina, registros: opts?.registros ?? 100, favorecido: opts?.favorecido, data_inicio: opts?.dtInicio, data_fim: opts?.dtFim, refresh: 'true' },
  )
}

export function useCPResumo(empresaId: number | null, dtInicio?: string, dtFim?: string) {
  return useApi<ResumoKPIsAPI>(
    empresaId ? `/empresas/${empresaId}/cp/resumo` : null,
    { data_inicio: dtInicio, data_fim: dtFim },
  )
}

// ── CR (Contas a Receber) ────────────────────────────────────

export function useCR(
  empresaId: number | null,
  opts?: { status?: string; pagina?: number; registros?: number; favorecido?: string; dtInicio?: string; dtFim?: string },
) {
  return useApi<PaginatedResponseAPI>(
    empresaId ? `/empresas/${empresaId}/cr` : null,
    { status: opts?.status, pagina: opts?.pagina, registros: opts?.registros ?? 100, favorecido: opts?.favorecido, data_inicio: opts?.dtInicio, data_fim: opts?.dtFim, refresh: 'true' },
  )
}

export function useCRResumo(empresaId: number | null, dtInicio?: string, dtFim?: string) {
  return useApi<ResumoKPIsAPI>(
    empresaId ? `/empresas/${empresaId}/cr/resumo` : null,
    { data_inicio: dtInicio, data_fim: dtFim },
  )
}

// ── Fluxo de Caixa ───────────────────────────────────────────

export function useFluxoCaixa(empresaId: number | null, dataFim?: string) {
  return useApi<FluxoCaixaAPI>(
    empresaId ? `/empresas/${empresaId}/fluxo-caixa` : null,
    { data_fim: dataFim },
  )
}

// ── Conciliação ──────────────────────────────────────────────

export function useConcilCalendario(empresaId: number | null) {
  return useApi<ConcilDiaAPI[]>(
    empresaId ? `/empresas/${empresaId}/conciliacao/calendario` : null,
  )
}

export function useConcilResumo(empresaId: number | null) {
  return useApi<ConcilResumoAPI>(
    empresaId ? `/empresas/${empresaId}/conciliacao/resumo` : null,
  )
}

export function useConcilMovimentacao(empresaId: number | null) {
  return useApi<ConcilMovimentoAPI[]>(
    empresaId ? `/empresas/${empresaId}/conciliacao/movimentacao` : null,
  )
}

export function useConcilDia(empresaId: number | null, data: string | null) {
  return useApi<ConcilDiaDetalheAPI>(
    empresaId && data ? `/empresas/${empresaId}/conciliacao/dia/${data}` : null,
  )
}

// ── Notificações ─────────────────────────────────────────────

export function useNotificacoes(limit?: number) {
  return useApi<NotificacaoAPI[]>('/notificacoes', { limit: limit ?? 50 })
}

export function useNotificacoesContagem() {
  return useApi<{ nao_lidas: number }>('/notificacoes/contagem')
}

export async function marcarNotificacaoLida(id: number) {
  return api.patch(`/notificacoes/${id}/ler`)
}

export async function marcarTodasLidas() {
  return api.post('/notificacoes/ler-todas')
}
