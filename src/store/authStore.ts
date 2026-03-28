import { create } from 'zustand'
import Cookies from 'js-cookie'

interface Empresa { id: number; nome: string; cnpj?: string; slug?: string }
interface Grupo { id: number; nome: string }
interface Permissao { modulo: string; acao: string; empresa_id?: number | null }

interface AuthState {
  token: string | null
  user: { id: number; nome: string; email: string; is_admin: boolean } | null
  empresas: Empresa[]
  empresaAtiva: Empresa | null
  grupos: Grupo[]
  grupoAtivo: Grupo | null
  permissoes: Permissao[]
  setAuth: (token: string, user: AuthState['user'], empresas: Empresa[], grupos?: Grupo[], permissoes?: Permissao[]) => void
  setEmpresaAtiva: (e: Empresa) => void
  setGrupoAtivo: (g: Grupo) => void
  hasPermissao: (modulo: string, acao: string, empresaId?: number) => boolean
  logout: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: typeof window !== 'undefined' ? Cookies.get('access_token') || null : null,
  user: null,
  empresas: [],
  empresaAtiva: null,
  grupos: [],
  grupoAtivo: null,
  permissoes: [],

  setAuth: (token, user, empresas, grupos = [], permissoes = []) => {
    Cookies.set('access_token', token, { expires: 1 })
    set({
      token, user, empresas,
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
    Cookies.remove('access_token')
    Cookies.remove('refresh_token')
    set({
      token: null, user: null, empresas: [], empresaAtiva: null,
      grupos: [], grupoAtivo: null, permissoes: [],
    })
  },
}))
