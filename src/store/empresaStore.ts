'use client'
import { create } from 'zustand'

export interface Empresa {
  id: string
  nome: string
  cnpj: string
  logoDark: string | null
  logoLight: string | null
  cor: string
}

const EMPRESAS_DEFAULT: Empresa[] = [
  {
    id: '1',
    nome: 'Alt Max Transportes',
    cnpj: '12.345.678/0001-00',
    logoDark: null,
    logoLight: null,
    cor: '#38BDF8',
  },
  {
    id: '2',
    nome: 'Alt Max Logística',
    cnpj: '12.345.678/0002-81',
    logoDark: null,
    logoLight: null,
    cor: '#34D399',
  },
]

interface EmpresaState {
  empresas: Empresa[]
  activeId: string
  setActive: (id: string) => void
  getActive: () => Empresa
  updateEmpresa: (id: string, data: Partial<Empresa>) => void
  addEmpresa: () => void
  removeEmpresa: (id: string) => void
}

export const useEmpresaStore = create<EmpresaState>((set, get) => ({
  empresas: EMPRESAS_DEFAULT,
  activeId: EMPRESAS_DEFAULT[0].id,
  setActive: (id) => set({ activeId: id }),
  getActive: () => {
    const state = get()
    return state.empresas.find((e) => e.id === state.activeId) || state.empresas[0]
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

export function getLogo(emp: Empresa, isDark: boolean): string | null {
  if (isDark) return emp.logoDark || emp.logoLight
  return emp.logoLight || emp.logoDark
}
