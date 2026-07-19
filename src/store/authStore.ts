import { create } from 'zustand'
import api from '@/lib/api'

interface Empresa {
  id: number
  nome: string
  cnpj?: string
  slug?: string
  /** Logos por tema (data URI base64) — persistidos no backend (api 0012)
   *  e entregues pelo /auth/me. Consumidos via empresaStore.getLogo. */
  logo_dark?: string | null
  logo_light?: string | null
}
interface Grupo { id: number; nome: string }

/**
 * STEP 11 — `empresaStore.activeId` é a fonte de verdade para empresa ativa.
 * `empresaAtiva` aqui é apenas um espelho legado consumido por componentes
 * antigos (Sidebar, ChatPanel, páginas /portal/grupo). Componentes novos
 * devem usar `useEmpresaId` ou `useEmpresaStore`.
 *
 * Para trocar a empresa ativa, sempre passe pelo empresaStore:
 *   useEmpresaStore.getState().setActive(id)
 *
 * `setEmpresaAtiva` aqui delega para o empresaStore e só serve como ponte
 * para callers legados. `setEmpresaAtivaInternal` é usado pelo empresaStore
 * para atualizar o espelho sem causar loop.
 */

interface AuthState {
  isAuthenticated: boolean
  user: { id: number; nome: string; email: string; is_admin: boolean } | null
  empresas: Empresa[]
  empresaAtiva: Empresa | null
  grupos: Grupo[]
  grupoAtivo: Grupo | null
  setAuth: (user: AuthState['user'], empresas: Empresa[], grupos?: Grupo[]) => void
  /** Compat: delega para empresaStore.setActive. Não chamar em código novo. */
  setEmpresaAtiva: (e: Empresa) => void
  /** Uso interno do empresaStore — atualiza só o espelho, não propaga. */
  setEmpresaAtivaInternal: (e: Empresa | null) => void
  setGrupoAtivo: (g: Grupo) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  user: null,
  empresas: [],
  empresaAtiva: null,
  grupos: [],
  grupoAtivo: null,

  // F4 da unificação (2026-07-19): as permissões LEGADAS do /auth/me saíram
  // do store — o gating visual usa o RBAC efetivo (permissoesStore) desde a
  // F2, e `hasPermissao` ficou sem consumidores.
  setAuth: (user, empresas, grupos = []) => {
    // Não pré-seleciona empresaAtiva — quem reconcilia é empresaStore.syncFromAuth,
    // que respeita activeId persistido e valida contra `empresas`.
    set({
      isAuthenticated: true,
      user, empresas,
      grupos,
      grupoAtivo: grupos[0] || null,
    })
  },

  setEmpresaAtiva: (e) => {
    // Delega para a fonte de verdade. Import dinâmico evita ciclo de módulo.
    import('./empresaStore').then(({ useEmpresaStore }) => {
      useEmpresaStore.getState().setActive(String(e.id))
    })
  },

  setEmpresaAtivaInternal: (e) => set({ empresaAtiva: e }),

  setGrupoAtivo: (g) => set({ grupoAtivo: g }),

  logout: () => {
    api.post('/auth/logout').catch(() => {})
    set({
      isAuthenticated: false, user: null, empresas: [], empresaAtiva: null,
      grupos: [], grupoAtivo: null,
    })
    // Limpa fonte de verdade da empresa + persistência, evita vazar entre usuários.
    import('./empresaStore').then(({ useEmpresaStore }) => {
      useEmpresaStore.getState().reset()
    })
    import('./unidadeStore').then(({ useUnidadeStore }) => {
      useUnidadeStore.getState().reset()
    })
    // Fase A PR 3: limpa cache RBAC do usuario anterior pra nao vazar
    // permissoes entre sessoes.
    import('./permissoesStore').then(({ usePermissoesStore }) => {
      usePermissoesStore.getState().reset()
    })
  },
}))
