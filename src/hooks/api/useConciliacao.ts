'use client'
import { useApi } from './_core'
import type {
  ConcilDiaAPI,
  ConcilResumoAPI,
  ConcilMovimentoAPI,
  ConcilDiaDetalheAPI,
} from '@/lib/types'

export function useConcilCalendario(empresaId: number | null, projetoIds?: string[]) {
  return useApi<ConcilDiaAPI[]>(
    empresaId ? `/empresas/${empresaId}/conciliacao/calendario` : null,
    { projeto_ids: projetoIds },
  )
}

export function useConcilResumo(empresaId: number | null, projetoIds?: string[]) {
  return useApi<ConcilResumoAPI>(
    empresaId ? `/empresas/${empresaId}/conciliacao/resumo` : null,
    { projeto_ids: projetoIds },
  )
}

export function useConcilMovimentacao(empresaId: number | null, projetoIds?: string[]) {
  return useApi<ConcilMovimentoAPI[]>(
    empresaId ? `/empresas/${empresaId}/conciliacao/movimentacao` : null,
    { projeto_ids: projetoIds },
  )
}

export function useConcilDia(empresaId: number | null, data: string | null, projetoIds?: string[]) {
  return useApi<ConcilDiaDetalheAPI>(
    empresaId && data ? `/empresas/${empresaId}/conciliacao/dia/${data}` : null,
    { projeto_ids: projetoIds },
  )
}
