'use client'
import { create } from 'zustand'

export interface Projeto {
  id: string
  nome: string
  codigo: string // código Omie
}

/**
 * Mapeamento empresa → projetos (filiais/unidades).
 * Em produção: substituir por chamada GET /projetos?empresa_id=X
 *
 * Somente empresas que usam segmentação por projeto aparecem aqui.
 * Se a empresa não está no mapa, o dropdown de unidade fica oculto.
 */
const PROJETOS_POR_EMPRESA: Record<string, Projeto[]> = {
  '1': [
    { id: 'proj_1', nome: 'Matriz Goiânia', codigo: 'MTZ-GYN' },
    { id: 'proj_2', nome: 'Filial Araguaína', codigo: 'FIL-ARA' },
    { id: 'proj_3', nome: 'Filial São Paulo', codigo: 'FIL-SP' },
    { id: 'proj_4', nome: 'Filial Inhumas', codigo: 'FIL-INH' },
  ],
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
    set({ loading: true, selectedIds: [] })

    // TODO: Em produção, substituir por:
    // const res = await api.get(`/projetos?empresa_id=${empresaId}`)
    // const projetos = res.data
    const projetos = PROJETOS_POR_EMPRESA[empresaId] || []

    set({ projetos, loading: false })
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
