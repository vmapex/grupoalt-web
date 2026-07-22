'use client'
/* ═══════════════════════════════════════════════════════════════
   Fase D — filtros globais do shell /bi/motor (ano + unidade),
   compartilhados entre as abas (Visão Executiva, Custo × Fat,
   Devedores, Fechamento) — mesmo papel do dateRangeStore no BI
   financeiro. `unidadeOpts` guarda a última lista completa de
   unidades vista numa resposta SEM filtro (quando filtra, o
   por_unidade da resposta colapsa numa só).
   ═══════════════════════════════════════════════════════════════ */
import { create } from 'zustand'

interface UnidadeOpt {
  id: number
  label: string
}

interface BiMotorState {
  ano: number
  unidadeId: number | null
  unidadeOpts: UnidadeOpt[]
  setAno: (ano: number) => void
  setUnidadeId: (id: number | null) => void
  setUnidadeOpts: (opts: UnidadeOpt[]) => void
}

export const useBiMotorStore = create<BiMotorState>((set) => ({
  ano: new Date().getFullYear(),
  unidadeId: null,
  unidadeOpts: [],
  setAno: (ano) => set({ ano }),
  setUnidadeId: (unidadeId) => set({ unidadeId }),
  setUnidadeOpts: (unidadeOpts) => set({ unidadeOpts }),
}))
