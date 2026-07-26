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
  /** QUINZENAL | DEZENA | MENSAL | NAVIO — recorte que a unidade pratica. */
  tipo_periodo?: string | null
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

export interface FechamentoBiAnoAPI {
  ano: number
  faturamento: number
  custo: number
  margem: number
  viagens: number
  fechamentos: number
  /** Variação % do faturamento vs o ano anterior; null no primeiro ano. */
  var_pct: number | null
  serie_mensal: { mes: number; faturamento: number; viagens: number; fechamentos: number }[]
}

export interface FechamentoBiAnualAPI {
  anos: FechamentoBiAnoAPI[]
  meta: { unidade_id: number | null; navio_id: number | null; fonte: string }
}

/** Crédito & Débito — espelho da página do Power BI, fórmulas canônicas
 *  do RelatoriosPage do Motor sobre o histórico consolidado (definições
 *  validadas 2026-07-23). `total_terceiros` é null até haver fonte no
 *  Motor ("aguardando definição"). */
export interface FechamentoBiCreditoDebitoAPI {
  credito: {
    comissao_bruta: number
    comissao_carretas: number
    seguro_boi: number
    saldo_posto: number
    imposto: number
    devedores: number
    adiantamentos: number
    /** Canon do Motor: subtotal do crédito = total razão do período. */
    subtotal: number
    total_terceiros: number | null
    total_postos: number
  }
  debito: {
    custo_motorista_liq: number
    devedores_gerados: { motorista_id: number | null; nome: string; valor: number }[]
    postos_outras_unidades: number
    desconto_razao: number
    total: number
  }
  rodape: {
    subtotal_credito: number
    total_debito: number
    /** Canon: total razão − custo motorista líquido. */
    valor_total_fechamento: number
    margem_pct: number
    liquido_a_pagar: number
  }
  fechamentos: {
    id: number
    unidade_id: number
    unidade_nome: string
    periodo_label: string | null
    ano: number
    mes: number
    dt_fechamento: string | null
    total_razao: number
    custo_motorista_liq: number
    valor_total: number
  }[]
  meta: {
    ano: number
    mes: number | null
    unidade_id: number | null
    navio_id: number | null
    dt_ini: string
    dt_fim: string
  }
}

export interface FechamentoBiPostoAPI {
  posto_id: number | null
  posto_nome: string
  abastecimento: number
  vale: number
  desconto: number
  liquido: number
  litros: number
  lancamentos: number
}

export interface FechamentoBiPostosAPI {
  kpis: {
    abastecimento: number
    vale: number
    desconto: number
    liquido: number
    litros: number
    lancamentos: number
    litros_disponivel: boolean
    rs_por_litro: number | null
  }
  por_posto: FechamentoBiPostoAPI[]
  meta: { ano: number; mes: number | null; unidade_id: number | null; nota_litros: string }
}

export interface FechamentoBiDevedoresAPI {
  kpis: {
    pendente_total: number
    pendente_count: number
    quitado_total: number
    quitado_count: number
  }
  aging: { faixa: string; valor: number; count: number }[]
  top_devedores: {
    motorista_id: number | null
    nome: string
    valor: number
    count: number
    mais_antigo_dias: number
  }[]
  por_unidade: { unidade_id: number | null; unidade_nome: string; valor: number; count: number }[]
  meta: { unidade_id: number | null }
}

export function useFechamentoBiFiltros() {
  return useApi<FechamentoBiFiltrosAPI>('/fechamento-bi/filtros')
}

export function useFechamentoBiCreditoDebito(params: {
  ano: number
  mes?: number | null
  unidade_id?: number | null
  navio_id?: number | null
}) {
  const clean: Record<string, number> = { ano: params.ano }
  if (params.mes) clean.mes = params.mes
  if (params.unidade_id) clean.unidade_id = params.unidade_id
  if (params.navio_id) clean.navio_id = params.navio_id
  return useApi<FechamentoBiCreditoDebitoAPI>('/fechamento-bi/credito-debito', clean)
}

export function useFechamentoBiPostos(params: {
  ano: number
  mes?: number | null
  unidade_id?: number | null
}) {
  const clean: Record<string, number> = { ano: params.ano }
  if (params.mes) clean.mes = params.mes
  if (params.unidade_id) clean.unidade_id = params.unidade_id
  return useApi<FechamentoBiPostosAPI>('/fechamento-bi/postos', clean)
}

export function useFechamentoBiDevedores(params: { unidade_id?: number | null }) {
  const clean: Record<string, number> = {}
  if (params.unidade_id) clean.unidade_id = params.unidade_id
  return useApi<FechamentoBiDevedoresAPI>('/fechamento-bi/devedores', clean)
}

export function useFechamentoBiFaturamentoAnual(params: {
  unidade_id?: number | null
  navio_id?: number | null
}) {
  const clean: Record<string, number> = {}
  if (params.unidade_id) clean.unidade_id = params.unidade_id
  if (params.navio_id) clean.navio_id = params.navio_id
  return useApi<FechamentoBiAnualAPI>('/fechamento-bi/faturamento-anual', clean)
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
