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
}

/** Lista todos os usuarios (admin-only). Reusa GET /admin/usuarios. */
export function useAdminUsuarios() {
  return useApi<AdminUsuarioListado[]>('/admin/usuarios')
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
