'use client'
/* ═══════════════════════════════════════════════════════════════
   Hooks de API admin de perfis RBAC — Fase A PR 4 (2026-05-22).

   Consome os 4 endpoints novos em `app/routers/admin.py`:
   - GET /admin/perfis
   - GET /admin/usuarios/{id}/atribuicoes
   - POST /admin/usuarios/{id}/atribuicoes
   - DELETE /admin/usuarios/{id}/atribuicoes/{aid}
   ═══════════════════════════════════════════════════════════════ */

import { useApi } from './_core'
import api from '@/lib/api'

export interface PerfilPermissaoResumo {
  modulo: string
  acao: string
}

export interface PerfilResumo {
  id: number
  nome: string
  descricao: string | null
  exports_confidencial: boolean
  sistema: boolean
  permissoes: PerfilPermissaoResumo[]
}

export interface AtribuicaoPerfil {
  id: number
  usuario_id: number
  perfil_id: number
  perfil_nome: string
  empresa_id: number
  empresa_nome: string
  criado_em: string
}

export interface AdminUsuarioListado {
  id: number
  nome: string
  email: string
  ativo: boolean
  is_admin: boolean
  /** F2 (2026-05-23): null = ativo; string ISO 8601 = soft-deletado.
   *  Quando truthy, UI mostra badge "DELETADO" + botao Restaurar.
   *  Backend so retorna este campo desde a migration 0010 + UsuarioResponse
   *  expose patch (api PR #116). */
  deleted_at?: string | null
}

interface UseAdminUsuariosOpts {
  /** Quando true, GET /admin/usuarios?include_deleted=true (UI de restore).
   *  Default false — lista padrao exclui soft-deletados. */
  includeDeleted?: boolean
}

/** Lista todos os usuarios (admin-only). Reusa GET /admin/usuarios.
 *
 *  F2 (2026-05-23): aceita `{ includeDeleted: true }` pra incluir soft-
 *  deletados na lista. UI de admin usa pra oferecer restore. */
export function useAdminUsuarios(opts: UseAdminUsuariosOpts = {}) {
  return useApi<AdminUsuarioListado[]>(
    '/admin/usuarios',
    opts.includeDeleted ? { include_deleted: 'true' } : undefined,
  )
}

/** Lista os 8 perfis canonicos cadastrados (seed + customs). */
export function useAdminPerfis() {
  return useApi<PerfilResumo[]>('/admin/perfis')
}

/** Lista atribuicoes de um usuario (em todas as empresas). */
export function useAdminUsuarioAtribuicoes(usuarioId: number | null) {
  return useApi<AtribuicaoPerfil[]>(
    usuarioId ? `/admin/usuarios/${usuarioId}/atribuicoes` : null,
  )
}

/** Atribui perfil a usuario numa empresa. Idempotente — duplicata retorna
 *  a atribuicao existente (com mesmo id). */
export async function criarAtribuicaoPerfil(
  usuarioId: number,
  perfilId: number,
  empresaId: number,
) {
  const res = await api.post<AtribuicaoPerfil>(
    `/admin/usuarios/${usuarioId}/atribuicoes`,
    { perfil_id: perfilId, empresa_id: empresaId },
  )
  return res.data
}

/** Revoga atribuicao. Idempotente — 204 mesmo se nao existir. */
export async function removerAtribuicaoPerfil(
  usuarioId: number,
  atribuicaoId: number,
) {
  await api.delete(`/admin/usuarios/${usuarioId}/atribuicoes/${atribuicaoId}`)
}


/** Soft delete de usuario (Bug #4, 2026-05-23). Confirmacao dupla:
 *  senha do admin atual + nome exato do usuario alvo (case-sensitive).
 *
 *  Status codes do backend (mapeados em DeleteUsuarioModal):
 *  - 204: sucesso (sem body)
 *  - 403: senha errada OU nome errado OU auto-delete OU ultimo admin
 *  - 404: usuario nao encontrado
 *  - 409: usuario ja soft-deletado (use restore) */
export async function deleteUsuario(
  usuarioId: number,
  senhaAdmin: string,
  nomeUsuario: string,
) {
  await api.delete(`/admin/usuarios/${usuarioId}`, {
    data: { senha_admin: senhaAdmin, nome_usuario: nomeUsuario },
  })
}


/** Reverte soft delete. 409 se nao estava deletado, 404 se nao existe.
 *  Por enquanto a UI nao expoe restore (escopo do PR cobre so delete);
 *  hook fica disponivel pra um PR de UI de restauracao no futuro. */
export async function restaurarUsuario(usuarioId: number) {
  await api.post(`/admin/usuarios/${usuarioId}/restore`)
}
