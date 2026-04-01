import { create } from 'zustand'
import api from '@/lib/api'

interface Empresa { id: number; nome: string; cnpj?: string; slug?: string }
interface Grupo { id: number; nome: string }
interface Permissao { modulo: string; acao: string; empresa_id?: number | null }

interface AuthState {
  isAuthenticated: boolean
  user: { id: number; nome: string; email: string; is_admin: boolean } | null
  empresas: Empresa[]
  empresaAtiva: Empresa | null
  grupos: Grupo[]
  grupoAtivo: Grupo | null
  permissoes: Permissao[]
  setAuth: (user: AuthState['user'], empresas: Empresa[], grupos?: Grupo[], permissoes?: Permissao[]) => void
  setEmpresaAtiva: (e: Empresa) => void
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
    set({
      isAuthenticated: true,
      user, empresas,
      empresaAtiva: empresas[0] || null,
      grupos,
      grupoAtivo: grupos[0] || null,
      permissoes,
    })
  },

  setEmpresaAtiva: (e) => set({ empresaAtiva: e }),
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
  },
}))
