'use client'
import { useApi } from './_core'
import api from '@/lib/api'

export interface CategoriaAPIItem {
  descricao: string
  nivel1: string
  nivel2: string
  /** Override manual do grupo DRE para esta empresa. Null = usa inferência por prefixo */
  grupo_dre: string | null
}

export function useCategorias(empresaId: number | null) {
  return useApi<Record<string, CategoriaAPIItem>>(
    empresaId ? `/empresas/${empresaId}/categorias` : null,
  )
}

/** Define ou remove o override de grupo DRE de uma categoria por empresa.
 *  Passe `grupoDre=null` para remover o override. */
export async function updateCategoriaGrupoDRE(
  empresaId: number,
  codigo: string,
  grupoDre: string | null,
) {
  return api.patch(`/empresas/${empresaId}/categorias/${codigo}`, {
    grupo_dre: grupoDre,
  })
}

/** Sincroniza APENAS o plano de contas (categorias) da Omie — síncrono.
 *  Retorna `{ sincronizadas, empresa_id }` quando bem-sucedido. */
export async function syncCategoriasEmpresa(empresaId: number) {
  const res = await api.post<{ sincronizadas: number; empresa_id: number; aviso?: string }>(
    `/empresas/${empresaId}/categorias/sync`,
  )
  return res.data
}

/** Aplica override de grupo DRE em várias categorias de uma só vez.
 *  Passe `grupoDre=null` para remover o override em todas. */
export async function bulkUpdateCategoriasGrupoDRE(
  empresaId: number,
  codigos: string[],
  grupoDre: string | null,
) {
  const res = await api.post<{ updated: number; grupo_dre: string | null; nao_encontradas: string[] }>(
    `/empresas/${empresaId}/categorias/bulk-override`,
    { codigos, grupo_dre: grupoDre },
  )
  return res.data
}
