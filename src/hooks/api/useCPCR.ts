'use client'
import { useApi, useApiPaginatedAll } from './_core'
import type { PaginatedResponseAPI, ResumoKPIsAPI } from '@/lib/types'

// ── CP (Contas a Pagar) ──────────────────────────────────────

export function useCP(
  empresaId: number | null,
  opts?: {
    status?: string
    pagina?: number
    registros?: number
    favorecido?: string
    dtInicio?: string
    dtFim?: string
    projetoIds?: string[]
  },
) {
  return useApi<PaginatedResponseAPI>(
    empresaId ? `/empresas/${empresaId}/cp` : null,
    {
      status: opts?.status,
      pagina: opts?.pagina,
      registros: opts?.registros ?? 500,
      favorecido: opts?.favorecido,
      data_inicio: opts?.dtInicio,
      data_fim: opts?.dtFim,
      projeto_ids: opts?.projetoIds,
    },
  )
}

export function useCPResumo(
  empresaId: number | null,
  dtInicio?: string,
  dtFim?: string,
  projetoIds?: string[],
) {
  return useApi<ResumoKPIsAPI>(
    empresaId ? `/empresas/${empresaId}/cp/resumo` : null,
    { data_inicio: dtInicio, data_fim: dtFim, projeto_ids: projetoIds },
  )
}

/** Variante de `useCP` que pagina automaticamente ate trazer TODOS os
 *  lancamentos (Step 13 — Parte C). Use em KPIs, breakdowns e contextos
 *  enviados pra IA — ou seja, qualquer lugar que NAO seja a tabela
 *  paginada da pagina /cp-cr. Para a tabela visual, prefira `useCP`. */
export function useCPAll(
  empresaId: number | null,
  opts?: {
    status?: string
    favorecido?: string
    dtInicio?: string
    dtFim?: string
    projetoIds?: string[]
  },
) {
  return useApiPaginatedAll(
    empresaId ? `/empresas/${empresaId}/cp` : null,
    {
      status: opts?.status,
      favorecido: opts?.favorecido,
      data_inicio: opts?.dtInicio,
      data_fim: opts?.dtFim,
      projeto_ids: opts?.projetoIds,
    },
  )
}

// ── CR (Contas a Receber) ────────────────────────────────────

export function useCR(
  empresaId: number | null,
  opts?: {
    status?: string
    pagina?: number
    registros?: number
    favorecido?: string
    dtInicio?: string
    dtFim?: string
    projetoIds?: string[]
  },
) {
  return useApi<PaginatedResponseAPI>(
    empresaId ? `/empresas/${empresaId}/cr` : null,
    {
      status: opts?.status,
      pagina: opts?.pagina,
      registros: opts?.registros ?? 500,
      favorecido: opts?.favorecido,
      data_inicio: opts?.dtInicio,
      data_fim: opts?.dtFim,
      projeto_ids: opts?.projetoIds,
    },
  )
}

export function useCRResumo(
  empresaId: number | null,
  dtInicio?: string,
  dtFim?: string,
  projetoIds?: string[],
) {
  return useApi<ResumoKPIsAPI>(
    empresaId ? `/empresas/${empresaId}/cr/resumo` : null,
    { data_inicio: dtInicio, data_fim: dtFim, projeto_ids: projetoIds },
  )
}

/** Variante de `useCR` que pagina automaticamente — ver `useCPAll`. */
export function useCRAll(
  empresaId: number | null,
  opts?: {
    status?: string
    favorecido?: string
    dtInicio?: string
    dtFim?: string
    projetoIds?: string[]
  },
) {
  return useApiPaginatedAll(
    empresaId ? `/empresas/${empresaId}/cr` : null,
    {
      status: opts?.status,
      favorecido: opts?.favorecido,
      data_inicio: opts?.dtInicio,
      data_fim: opts?.dtFim,
      projeto_ids: opts?.projetoIds,
    },
  )
}

// ── Baixas (pagamentos individuais, on-demand) ──────────────

interface BaixaItem {
  data: string | null
  valor: number
  desconto: number
  juros: number
  multa: number
  codigo_baixa?: number
}

interface BaixasResponse {
  baixas: BaixaItem[]
}

export function useBaixas(empresaId: number | null, tipo: 'CP' | 'CR', codigo: number | null) {
  const endpoint = tipo === 'CP' ? 'cp' : 'cr'
  return useApi<BaixasResponse>(
    empresaId && codigo ? `/empresas/${empresaId}/${endpoint}/${codigo}/baixas` : null,
  )
}
