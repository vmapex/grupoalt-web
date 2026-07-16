'use client'
import { useApi } from './_core'
import api from '@/lib/api'

export interface AdminEmpresaAPI {
  id: number
  nome: string
  cnpj: string | null
  slug: string | null
  ativa: boolean
  grupo_id: number | null
  tipo: string | null
  ordem: number
  tem_credencial: boolean
  /** ISO 8601 quando soft-deletada, null quando ativa. */
  deleted_at: string | null
}

/** Lista admin de empresas. Inclui soft-deletadas (intencional — UI precisa
 *  pra renderizar badge "Deletada" e botao Restaurar). */
export function useAdminEmpresas() {
  return useApi<AdminEmpresaAPI[]>('/admin/empresas')
}

/** Soft delete empresa (P0-7). Backend exige confirmacao dupla:
 *  - `senhaAdmin`: bate com bcrypt do admin logado
 *  - `nomeEmpresa`: match exato com `empresa.nome` (case-sensitive)
 *  Erros possiveis:
 *  - 403 senha/nome errado
 *  - 409 ja soft-deletada (usar restore)
 *  - 404 empresa nao existe */
export async function deleteEmpresa(
  empresaId: number,
  senhaAdmin: string,
  nomeEmpresa: string,
) {
  await api.delete(`/admin/empresas/${empresaId}`, {
    data: { senha_admin: senhaAdmin, nome_empresa: nomeEmpresa },
  })
}

/** Restaura empresa soft-deletada. Zera `deleted_at` de volta para NULL.
 *  Erros possiveis:
 *  - 409 empresa nao estava soft-deletada
 *  - 404 empresa nao existe */
export async function restoreEmpresa(empresaId: number) {
  const res = await api.post<{ message: string }>(
    `/admin/empresas/${empresaId}/restore`,
  )
  return res.data
}

/** Persiste logos (dark/light) da empresa no backend (api 0012).
 *  Semântica de patch parcial: campo omitido não é alterado; campo
 *  presente com null remove o logo. Valores são data URI base64
 *  (data:image/...;base64,...), máx ~500KB — o backend valida (422). */
export async function updateEmpresaLogos(
  empresaId: number,
  logos: { logo_dark?: string | null; logo_light?: string | null },
) {
  const res = await api.put<{ message: string; logo_dark: boolean; logo_light: boolean }>(
    `/admin/empresas/${empresaId}/logos`,
    logos,
  )
  return res.data
}

/** Hard delete REAL da empresa (IRREVERSIVEL): apaga a linha + cascade em
 *  credenciais, vinculos, permissoes e TODOS os dados financeiros. Backend
 *  exige defesa em profundidade tripla:
 *  - empresa ja soft-deletada (senao 409)
 *  - `senhaAdmin` valida (senao 403)
 *  - `nomeEmpresa` match EXATO (senao 403)
 *  Espelho do permanentDeleteUsuario (useAdminPerfis). */
export async function permanentDeleteEmpresa(
  empresaId: number,
  senhaAdmin: string,
  nomeEmpresa: string,
) {
  await api.delete(`/admin/empresas/${empresaId}/permanent`, {
    data: { senha_admin: senhaAdmin, nome_empresa: nomeEmpresa },
  })
}
