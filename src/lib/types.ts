/* ═══════════════════════════════════════════════════════════════
   Tipos compartilhados — Shapes da API + Frontend
   ═══════════════════════════════════════════════════════════════ */

// ── Extrato (GET /empresas/{id}/extrato) ──────────────────────

export interface ExtratoAPI {
  id: number
  data_lancamento: string | null  // DD/MM/YYYY
  data_conciliacao: string | null
  descricao: string
  favorecido: string | null
  valor: number
  tipo: string | null
  conciliado: boolean
  conta_id: number | null
  categoria: string | null
  documento: string | null
  origem: string | null
  banco: string | null
}

export interface ExtratoResponseAPI {
  saldo_inicial: number
  saldo_atual: number
  lancamentos: ExtratoAPI[]
  saldos_contas: SaldoAPI[]
}

// ── Contas (GET /empresas/{id}/contas) ────────────────────────

export interface ContaAPI {
  id: number
  descricao: string
  banco: string | null
  tipo: string | null
  ativa: boolean
}

// ── Saldos (GET /empresas/{id}/saldos) ────────────────────────

export interface SaldoAPI {
  conta_id: number
  descricao: string
  banco: string | null
  saldo: number
}

// ── CP/CR (GET /empresas/{id}/cp ou /cr) ──────────────────────

export interface LancamentoAPI {
  codigo: number
  favorecido: string
  categoria: string
  data_emissao: string | null
  data_vcto: string | null
  data_previsao: string | null
  data_pagamento: string | null
  valor: number
  valor_pago: number | null
  saldo: number
  status: string  // A VENCER | ATRASADO | PAGO | RECEBIDO
  numero_documento: string | null
  observacao: string | null
}

export interface ResumoKPIsAPI {
  total_aberto: number
  total_a_vencer: number
  total_atrasado: number
  total_realizado: number
  quantidade_aberto: number
  quantidade_a_vencer: number
  quantidade_atrasado: number
  quantidade_realizado: number
  por_categoria: Array<{ categoria: string; valor: number }>
}

export interface PaginatedResponseAPI {
  total: number
  pagina: number
  registros: number
  paginas: number
  dados: LancamentoAPI[]
}

// ── Fluxo de Caixa (GET /empresas/{id}/fluxo-caixa) ──────────

export interface FluxoDiarioAPI {
  data: string
  entradas: number
  saidas: number
  liquido: number
  saldo_acumulado: number
}

export interface FluxoMensalAPI {
  mes: string
  entradas: number
  saidas: number
  liquido: number
}

export interface FluxoKPIsAPI {
  saldo_atual: number
  total_entradas: number
  total_saidas: number
  saldo_projetado: number
  cobertura: number
}

export interface FluxoCaixaAPI {
  kpis: FluxoKPIsAPI
  diario: FluxoDiarioAPI[]
  mensal: FluxoMensalAPI[]
}

// ── Conciliação (GET /empresas/{id}/conciliacao/calendario) ───

export interface ConcilDiaAPI {
  data: string  // YYYY-MM-DD
  status: 'ok' | 'pendente' | 'diverge' | 'sem-mov'
  total_lancamentos: number
  total_entradas: number
  total_saidas: number
  diferenca: number
}

export interface ConcilResumoAPI {
  percentual_conciliado: number
  total_divergencias: number
  maior_diferenca: number
  dias_sem_conciliar: number
  media_diaria_extrato: number
}

export interface ConcilMovimentoAPI {
  data: string
  extrato: number
  saldo_banco: number
  diferenca: number
  status: string
  banco: string
}

export interface ConcilDiaDetalheAPI {
  data: string
  lancamentos: Array<{
    id: number
    descricao: string
    valor: number
    conciliado: boolean
    categoria: string | null
  }>
}

// ── Notificações (GET /notificacoes) ──────────────────────────

export interface NotificacaoAPI {
  id: number
  tipo: string
  titulo: string
  mensagem: string
  lida: boolean
  link: string | null
  criado_em: string | null
}
