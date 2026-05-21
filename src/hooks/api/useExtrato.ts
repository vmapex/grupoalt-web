'use client'
import { useApi } from './_core'
import type { ExtratoResponseAPI } from '@/lib/types'

export function useExtrato(
  empresaId: number | null,
  dtInicio?: string,
  dtFim?: string,
  projetoIds?: string[],
  incluirProjecao?: boolean,
) {
  return useApi<ExtratoResponseAPI>(
    empresaId ? `/empresas/${empresaId}/extrato` : null,
    {
      dt_inicio: dtInicio,
      dt_fim: dtFim,
      projeto_ids: projetoIds,
      incluir_projecao: incluirProjecao ? 'true' : undefined,
    },
  )
}
