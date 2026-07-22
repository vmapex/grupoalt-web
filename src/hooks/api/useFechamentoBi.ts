/* ═══════════════════════════════════════════════════════════════
   BI de Fechamento — hooks do read-through do Motor.

   Consome /v1/fechamento-bi/* do portal-api (agregados do HISTÓRICO
   DE FECHAMENTO consolidado do Motor, cache Redis 10min). Gate no
   backend: fechamento:bi — a UI espelha com PermissionGate.

   Tipos espelham app/routers/fechamento_bi.py + o agregador
   app/services/fechamento_bi.py do portal-api.
   ═══════════════════════════════════════════════════════════════ */
import { useApi } from './_core'

export interface FechamentoBiUnidadeOptAPI {
  id: number
  nome: string
  cidade?: string | null
  uf?: string | null
}

export interface FechamentoBiNavioOptAPI {
  id: number
  nome: string
}

export interface FechamentoBiFiltrosAPI {
  unidades: FechamentoBiUnidadeOptAPI[]
  navios: FechamentoBiNavioOptAPI[]
  /** ids de navios que aparecem em algum fechamento (pré-filtro do dropdown). */
  navios_com_fechamento: number[]
  /** Anos com fechamento no histórico, desc — alimenta o filtro ANO. */
  anos: number[]
  meses_por_ano: Record<string, number[]>
  total_fechamentos: number
}

export interface FechamentoBiSerieMesAPI {
  mes: number
  faturamento: number
  custo: number
  margem: number
  viagens: number
  fechamentos: number
}

export interface FechamentoBiUnidadeAPI {
  unidade_id: number
  unidade_nome: string
  faturamento: number
  custo: number
  margem: number
  viagens: number
  fechamentos: number
}

export interface FechamentoBiAbcAPI {
  motorista_id: number | null
  nome: string
  tipo_contrato: string
  custo: number
  viagens: number
}

export interface FechamentoBiFechamentoAPI {
  id: number
  unidade_id: number
  unidade_nome: string
  periodo_label: string | null
  ano: number
  mes: number
  navio_id: number | null
  dt_ini: string | null
  dt_fim: string | null
  dt_fechamento: string | null
  faturamento: number
  custo: number
  margem: number
  viagens: number
}

export interface FechamentoBiResumoAPI {
  kpis: {
    faturamento: number
    custo: number
    margem: number
    margem_pct: number
    viagens: number
    cabecas: number
    km: number
    fechamentos: number
  }
  serie_mensal: FechamentoBiSerieMesAPI[]
  por_unidade: FechamentoBiUnidadeAPI[]
  /** Curva ABC de agregados — custo por motorista, desc (top 50). */
  abc_agregados: FechamentoBiAbcAPI[]
  fechamentos: FechamentoBiFechamentoAPI[]
  /** Litros zerados na base do Motor: só custo em R$; R$/litro e km/litro
   *  ficam previstos e DESABILITADOS até litros_disponivel virar true. */
  abastecimento: {
    valor_total: number
    litros_total: number
    litros_disponivel: boolean
    rs_por_litro: number | null
    nota: string
  }
  meta: {
    ano: number
    mes: number | null
    unidade_id: number | null
    navio_id: number | null
    fonte: string
  }
}

export function useFechamentoBiFiltros() {
  return useApi<FechamentoBiFiltrosAPI>('/fechamento-bi/filtros')
}

export function useFechamentoBiResumo(params: {
  ano: number
  mes?: number | null
  unidade_id?: number | null
  navio_id?: number | null
}) {
  const clean: Record<string, number> = { ano: params.ano }
  if (params.mes) clean.mes = params.mes
  if (params.unidade_id) clean.unidade_id = params.unidade_id
  if (params.navio_id) clean.navio_id = params.navio_id
  return useApi<FechamentoBiResumoAPI>('/fechamento-bi/resumo', clean)
}
