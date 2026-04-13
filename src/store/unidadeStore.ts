'use client'
import { create } from 'zustand'
import api from '@/lib/api'

export interface Projeto {
  id: string
  nome: string
  codigo: string // código Omie
}

interface UnidadeState {
  projetos: Projeto[]
  /** IDs selecionados. Vazio = "Todas as unidades" */
  selectedIds: string[]
  loading: boolean

  fetchProjetos: (empresaId: string) => Promise<void>

  /** Toggle individual: adiciona ou remove do array */
  toggle: (projetoId: string) => void

  /** Seleciona todas (limpa seleção) */
  selectAll: () => void

  /** Retorna os projetos selecionados (vazio = todos) */
  getSelected: () => Projeto[]

  /** Helper: checa se um projeto está selecionado */
  isSelected: (projetoId: string) => boolean

  /** Helper: retorna true se TODOS estão selecionados (ou nenhum filtro ativo) */
  isAllSelected: () => boolean
}

export const useUnidadeStore = create<UnidadeState>((set, get) => ({
  projetos: [],
  selectedIds: [],
  loading: false,

  fetchProjetos: async (empresaId: string) => {
    if (!empresaId) {
      set({ projetos: [], loading: false, selectedIds: [] })
      return
    }
    set({ loading: true, selectedIds: [] })

    try {
      const res = await api.get(`/gestao/empresas/${empresaId}/unidades`)
      const data = res.data as Array<{ id: number; nome: string; codigo: string | null; ativa: boolean }>
      const projetos: Projeto[] = data
        .filter((u) => u.ativa !== false)
        .map((u) => ({
          id: String(u.id),
          nome: u.nome,
          codigo: u.codigo || '',
        }))
      set({ projetos, loading: false })
    } catch (err) {
      console.warn('[unidadeStore] fetchProjetos falhou:', err)
      set({ projetos: [], loading: false })
    }
  },

  toggle: (projetoId) => set((s) => {
    const has = s.selectedIds.includes(projetoId)
    const next = has
      ? s.selectedIds.filter((id) => id !== projetoId)
      : [...s.selectedIds, projetoId]
    return { selectedIds: next }
  }),

  selectAll: () => set({ selectedIds: [] }),

  getSelected: () => {
    const { projetos, selectedIds } = get()
    if (selectedIds.length === 0) return projetos
    return projetos.filter((p) => selectedIds.includes(p.id))
  },

  isSelected: (projetoId) => get().selectedIds.includes(projetoId),

  isAllSelected: () => get().selectedIds.length === 0,
}))
