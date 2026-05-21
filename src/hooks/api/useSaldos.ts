'use client'
import { useApi } from './_core'
import type { SaldoAPI } from '@/lib/types'

export function useSaldos(
  empresaId: number | null,
  dtInicio?: string,
  dtFim?: string,
  projetoIds?: string[],
  incluirProjecao?: boolean,
) {
  return useApi<SaldoAPI[]>(
    empresaId ? `/empresas/${empresaId}/saldos` : null,
    {
      dt_inicio: dtInicio,
      dt_fim: dtFim,
      projeto_ids: projetoIds,
      incluir_projecao: incluirProjecao ? 'true' : undefined,
    },
  )
}
