import { create } from 'zustand'
import api from '@/lib/api'

interface Empresa { id: number; nome: string; cnpj?: string; slug?: string }
interface Grupo { id: number; nome: string }
interface Permissao { modulo: string; acao: string; empresa_id?: number | null }

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
  permissoes: Permissao[]
  setAuth: (user: AuthState['user'], empresas: Empresa[], grupos?: Grupo[], permissoes?: Permissao[]) => void
  /** Compat: delega para empresaStore.setActive. Não chamar em código novo. */
  setEmpresaAtiva: (e: Empresa) => void
  /** Uso interno do empresaStore — atualiza só o espelho, não propaga. */
  setEmpresaAtivaInternal: (e: Empresa | null) => void
  setGrupoAtivo: (g: Grupo) => void
  hasPermissao: (modulo: string, acao: string, empresaId?: number) => boolean
  logout: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  user: null,
  empresas: [],
  empresaAtiva: null,
  grupos: [],
  grupoAtivo: null,
  permissoes: [],

  setAuth: (user, empresas, grupos = [], permissoes = []) => {
    // Não pré-seleciona empresaAtiva — quem reconcilia é empresaStore.syncFromAuth,
    // que respeita activeId persistido e valida contra `empresas`.
    set({
      isAuthenticated: true,
      user, empresas,
      grupos,
      grupoAtivo: grupos[0] || null,
      permissoes,
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

  hasPermissao: (modulo, acao, empresaId) => {
    const { user, permissoes } = get()
    if (user?.is_admin) return true
    return permissoes.some(p =>
      p.modulo === modulo &&
      p.acao === acao &&
      (p.empresa_id == null || p.empresa_id === empresaId)
    )
  },

  logout: () => {
    api.post('/auth/logout').catch(() => {})
    set({
      isAuthenticated: false, user: null, empresas: [], empresaAtiva: null,
      grupos: [], grupoAtivo: null, permissoes: [],
    })
    // Limpa fonte de verdade da empresa + persistência, evita vazar entre usuários.
    import('./empresaStore').then(({ useEmpresaStore }) => {
      useEmpresaStore.getState().reset()
    })
    import('./unidadeStore').then(({ useUnidadeStore }) => {
      useUnidadeStore.getState().reset()
    })
  },
}))
