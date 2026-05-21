'use client'
import { useApi } from './_core'
import api from '@/lib/api'

export interface ContaBancariaAPIItem {
  id: number           // omie_id
  descricao: string | null
  banco: string | null
  tipo: string | null
  ativa: boolean       // inverso de inativo
  incluir_bi: boolean
  is_projecao: boolean
}

export function useContasBancarias(empresaId: number | null) {
  return useApi<ContaBancariaAPIItem[]>(
    empresaId ? `/empresas/${empresaId}/contas` : null,
  )
}

/** Atualiza flags de uma conta bancária. Omita um campo para não alterar. */
export async function updateContaBancariaFlags(
  empresaId: number,
  omieId: number,
  flags: { incluir_bi?: boolean; is_projecao?: boolean },
) {
  const res = await api.patch<ContaBancariaAPIItem>(
    `/empresas/${empresaId}/contas-bancarias/${omieId}`,
    flags,
  )
  return res.data
}
