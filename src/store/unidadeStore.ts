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
  // Apenas "Alt Max Transportes" (id=1) usa projetos/filiais
  '1': [
    { id: 'proj_1', nome: 'Matriz Goiânia', codigo: 'MTZ-GYN' },
    { id: 'proj_2', nome: 'Filial Araguaína', codigo: 'FIL-ARA' },
    { id: 'proj_3', nome: 'Filial São Paulo', codigo: 'FIL-SP' },
    { id: 'proj_4', nome: 'Filial Inhumas', codigo: 'FIL-INH' },
  ],
  // '2' (Alt Max Logística) não usa projetos → dropdown oculto
}

interface UnidadeState {
  projetos: Projeto[]
  activeProjetoId: string | null // null = "Todas as unidades"
  loading: boolean

  /** Carrega projetos para a empresa. Em produção: fetch da API */
  fetchProjetos: (empresaId: string) => Promise<void>

  /** Seleciona um projeto (ou null para "Todas") */
  setActive: (projetoId: string | null) => void

  /** Retorna o projeto ativo ou null */
  getActive: () => Projeto | null
}

export const useUnidadeStore = create<UnidadeState>((set, get) => ({
  projetos: [],
  activeProjetoId: null,
  loading: false,

  fetchProjetos: async (empresaId: string) => {
    set({ loading: true, activeProjetoId: null })

    // TODO: Em produção, substituir por:
    // const res = await api.get(`/projetos?empresa_id=${empresaId}`)
    // const projetos = res.data
    const projetos = PROJETOS_POR_EMPRESA[empresaId] || []

    set({ projetos, loading: false })
  },

  setActive: (projetoId) => set({ activeProjetoId: projetoId }),

  getActive: () => {
    const { projetos, activeProjetoId } = get()
    if (!activeProjetoId) return null
    return projetos.find((p) => p.id === activeProjetoId) || null
  },
}))
