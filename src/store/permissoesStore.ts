'use client'
/* ═══════════════════════════════════════════════════════════════
   Store das permissoes efetivas do usuario logado por empresa.

   Fase A PR 3 — RBAC granular (2026-05-22).

   Cacheia o response de `GET /auth/me/permissoes/{empresa_id}` por
   empresa_id em memoria (sem persist — recarrega a cada hard refresh).
   Hook `usePermission` consulta o cache; quando a empresa ativa muda,
   `fetchForActive()` dispara refetch.

   Decisao de NAO persistir: as permissoes podem mudar do lado do
   admin (atribuir/remover perfil, override) e queremos refletir
   isso no proximo refresh. TTL ideal = sessao da aba.
   ═══════════════════════════════════════════════════════════════ */

import { create } from 'zustand'
import api from '@/lib/api'

export interface PerfilAtribuido {
  id: number
  nome: string
  descricao: string | null
  exports_confidencial: boolean
}

export interface PermissaoTuple {
  modulo: string
  acao: string
  empresa_id: number | null
}

export interface PermissoesEmpresa {
  empresa_id: number
  is_admin_global: boolean
  exports_confidencial: boolean
  perfis: PerfilAtribuido[]
  /** Set efetivo de (modulo, acao). Usar `has()` ao invez de iterar. */
  permissoes: PermissaoTuple[]
  /** Timestamp do fetch — pra debugging/staleness checks. */
  fetched_at: number
}

interface PermissoesState {
  /** Cache por empresa_id. `undefined` = nao buscado ainda. */
  porEmpresa: Record<number, PermissoesEmpresa | undefined>
  loading: Record<number, boolean>
  errors: Record<number, string | null>
  /** Busca permissoes para a empresa, atualiza cache. Idempotente — ja em loading
   *  retorna sem disparar nova request. */
  fetch: (empresaId: number) => Promise<void>
  /** Forca refetch ignorando cache. Util pos-mutacao admin (PR 4). */
  refetch: (empresaId: number) => Promise<void>
  /** Limpa cache em logout. */
  reset: () => void
}

export const usePermissoesStore = create<PermissoesState>((set, get) => ({
  porEmpresa: {},
  loading: {},
  errors: {},

  fetch: async (empresaId) => {
    const state = get()
    // Skip se ja tem cache OU ja esta carregando
    if (state.porEmpresa[empresaId] || state.loading[empresaId]) return
    set((s) => ({ loading: { ...s.loading, [empresaId]: true } }))
    try {
      const res = await api.get<Omit<PermissoesEmpresa, 'fetched_at'>>(
        `/auth/me/permissoes/${empresaId}`,
      )
      set((s) => ({
        porEmpresa: {
          ...s.porEmpresa,
          [empresaId]: { ...res.data, fetched_at: Date.now() },
        },
        loading: { ...s.loading, [empresaId]: false },
        errors: { ...s.errors, [empresaId]: null },
      }))
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } }; message?: string }
      const msg = e?.response?.data?.detail || e?.message || 'Erro ao carregar permissoes'
      set((s) => ({
        loading: { ...s.loading, [empresaId]: false },
        errors: { ...s.errors, [empresaId]: msg },
      }))
    }
  },

  refetch: async (empresaId) => {
    set((s) => ({
      porEmpresa: { ...s.porEmpresa, [empresaId]: undefined },
    }))
    await get().fetch(empresaId)
  },

  reset: () => set({ porEmpresa: {}, loading: {}, errors: {} }),
}))


/** Helper puro: dado um response de permissoes, checa se concede (modulo, acao).
 *  Exportado pra testes goldens. */
export function hasPermissionIn(
  perms: PermissoesEmpresa | undefined,
  modulo: string,
  acao: string,
): boolean {
  if (!perms) return false
  // Admin global passa em qualquer permissao do vocabulario.
  if (perms.is_admin_global) return true
  return perms.permissoes.some((p) => p.modulo === modulo && p.acao === acao)
}
