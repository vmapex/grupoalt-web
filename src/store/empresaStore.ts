'use client'
import { create } from 'zustand'
import { useAuthStore } from './authStore'

export interface Empresa {
  id: string
  nome: string
  cnpj: string
  logoDark: string | null
  logoLight: string | null
  cor: string
}

const CORES = ['#38BDF8', '#34D399', '#FBBF24', '#F87171', '#C084FC', '#FB923C']

interface EmpresaState {
  empresas: Empresa[]
  activeId: string
  _synced: boolean
  setActive: (id: string) => void
  getActive: () => Empresa | null
  syncFromAuth: () => void
  updateEmpresa: (id: string, data: Partial<Empresa>) => void
  addEmpresa: () => void
  removeEmpresa: (id: string) => void
}

export const useEmpresaStore = create<EmpresaState>((set, get) => ({
  empresas: [],
  activeId: '',
  _synced: false,

  setActive: (id) => {
    set({ activeId: id })
    // Also sync to authStore if empresa exists there
    const auth = useAuthStore.getState()
    const emp = auth.empresas.find((e) => e.id === Number(id))
    if (emp) auth.setEmpresaAtiva(emp)
  },

  getActive: () => {
    const state = get()
    return state.empresas.find((e) => e.id === state.activeId) || state.empresas[0] || null
  },

  /** Pull empresas from authStore (populated by /auth/me) */
  syncFromAuth: () => {
    const auth = useAuthStore.getState()
    if (!auth.empresas.length) return

    const empresas: Empresa[] = auth.empresas.map((e, i) => ({
      id: String(e.id),
      nome: e.nome,
      cnpj: e.cnpj || '',
      logoDark: null,
      logoLight: null,
      cor: CORES[i % CORES.length],
    }))

    const activeId = auth.empresaAtiva ? String(auth.empresaAtiva.id) : empresas[0]?.id || '1'
    set({ empresas, activeId, _synced: true })
  },

  updateEmpresa: (id, data) =>
    set((s) => ({
      empresas: s.empresas.map((e) => (e.id === id ? { ...e, ...data } : e)),
    })),

  addEmpresa: () =>
    set((s) => {
      const newId = String(Date.now())
      return {
        empresas: [
          ...s.empresas,
          {
            id: newId,
            nome: 'Nova Empresa',
            cnpj: '00.000.000/0000-00',
            logoDark: null,
            logoLight: null,
            cor: '#38BDF8',
          },
        ],
      }
    }),

  removeEmpresa: (id) =>
    set((s) => {
      if (s.empresas.length <= 1) return s
      const filtered = s.empresas.filter((e) => e.id !== id)
      const activeId = s.activeId === id ? filtered[0].id : s.activeId
      return { empresas: filtered, activeId }
    }),
}))

export function getLogo(emp: Empresa | null, isDark: boolean): string | null {
  if (!emp) return null
  if (isDark) return emp.logoDark || emp.logoLight
  return emp.logoLight || emp.logoDark
}
