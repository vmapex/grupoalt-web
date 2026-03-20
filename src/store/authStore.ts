import { create } from 'zustand'
import Cookies from 'js-cookie'

interface Empresa { id: number; nome: string; cnpj?: string }
interface AuthState {
  token: string | null
  user: { id: number; nome: string; email: string; is_admin: boolean } | null
  empresas: Empresa[]
  empresaAtiva: Empresa | null
  setAuth: (token: string, user: AuthState['user'], empresas: Empresa[]) => void
  setEmpresaAtiva: (e: Empresa) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: typeof window !== 'undefined' ? Cookies.get('access_token') || null : null,
  user: null,
  empresas: [],
  empresaAtiva: null,

  setAuth: (token, user, empresas) => {
    Cookies.set('access_token', token, { expires: 1 })
    set({ token, user, empresas, empresaAtiva: empresas[0] || null })
  },

  setEmpresaAtiva: (e) => set({ empresaAtiva: e }),

  logout: () => {
    Cookies.remove('access_token')
    Cookies.remove('refresh_token')
    set({ token: null, user: null, empresas: [], empresaAtiva: null })
  },
}))
