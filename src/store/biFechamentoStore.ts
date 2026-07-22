'use client'
/* ═══════════════════════════════════════════════════════════════
   BI de Fechamento — filtros globais do shell /bi/fechamento,
   compartilhados entre as 6 telas (mesmo papel do biMotorStore no
   /bi/motor). Espelham os filtros do Power BI de referência:
   ANO · MÊS · QUINZENA/DEZENA · NAVIO · UNIDADE.

   As OPÇÕES são dinâmicas (GET /fechamento-bi/filtros — unidades,
   navios e anos descobertos da API do Motor; a operação vai crescer
   além das 4 unidades/3 clientes atuais, nada hardcoded). Quinzena/
   dezena é recorte LOCAL sobre os fechamentos retornados (cada um
   tem dt_ini/dt_fim/periodo_label) — não viaja pra API.
   ═══════════════════════════════════════════════════════════════ */
import { create } from 'zustand'

export interface OpcaoFiltro {
  id: number
  label: string
}

/** Recorte intra-mês: quinzenas (Q1/Q2) ou dezenas (D1/D2/D3). */
export type PeriodoIntraMes = '' | 'Q1' | 'Q2' | 'D1' | 'D2' | 'D3'

export const PERIODO_INTRA_MES_OPTS: { value: PeriodoIntraMes; label: string }[] = [
  { value: '', label: 'Período completo' },
  { value: 'Q1', label: '1ª quinzena' },
  { value: 'Q2', label: '2ª quinzena' },
  { value: 'D1', label: '1ª dezena' },
  { value: 'D2', label: '2ª dezena' },
  { value: 'D3', label: '3ª dezena' },
]

interface BiFechamentoState {
  ano: number
  mes: number | null
  periodo: PeriodoIntraMes
  navioId: number | null
  unidadeId: number | null
  anoOpts: number[]
  unidadeOpts: OpcaoFiltro[]
  navioOpts: OpcaoFiltro[]
  setAno: (ano: number) => void
  setMes: (mes: number | null) => void
  setPeriodo: (periodo: PeriodoIntraMes) => void
  setNavioId: (id: number | null) => void
  setUnidadeId: (id: number | null) => void
  setOpts: (opts: { anos: number[]; unidades: OpcaoFiltro[]; navios: OpcaoFiltro[] }) => void
}

export const useBiFechamentoStore = create<BiFechamentoState>((set) => ({
  ano: new Date().getFullYear(),
  mes: null,
  periodo: '',
  navioId: null,
  unidadeId: null,
  anoOpts: [],
  unidadeOpts: [],
  navioOpts: [],
  setAno: (ano) => set({ ano }),
  setMes: (mes) => set({ mes }),
  setPeriodo: (periodo) => set({ periodo }),
  setNavioId: (navioId) => set({ navioId }),
  setUnidadeId: (unidadeId) => set({ unidadeId }),
  setOpts: ({ anos, unidades, navios }) =>
    set((s) => ({
      anoOpts: anos,
      unidadeOpts: unidades,
      navioOpts: navios,
      // Se o ano selecionado não existe no histórico, cai pro mais recente.
      ano: anos.length && !anos.includes(s.ano) ? anos[0] : s.ano,
    })),
}))
