/* ═══════════════════════════════════════════════════════════════
   Tipos compartilhados — Shapes da API + Frontend
   ═══════════════════════════════════════════════════════════════ */

/** ADR-002: payload de sync embarcado em responses que detectam DB
 *  vazio. Quando presente, front deve montar SyncProgress e fazer
 *  polling de /sync/status/{empresa_id}. */
export interface SyncPendingFields {
  sync_pending?: boolean | null
  sync_status?: {
    empresa_id: number
    in_progress: boolean
    stage: string | null
    stage_label: string | null
    stages_completed: string[]
    stages_failed: Array<{ stage: string; error: string }>
    progress: { current: number; total: number }
    started_at: string | null
    last_completed_at: string | null
    ultima_sync: string | null
    registros: { lancamentos: number; contas_pagar: number; contas_receber: number }
    stage_labels: Record<string, string>
  } | null
}

// ── Extrato (GET /empresas/{id}/extrato) ──────────────────────

export interface ExtratoAPI {
  id: number
  // P1-2 Camada 2.2b.2: ISO 8601 "YYYY-MM-DD" (era DD/MM/YYYY).
  // Use formatIsoToBr() pra exibir como DD/MM/YYYY no UI.
  data_lancamento: string | null
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
  projeto_omie_id: string | null
}

export interface ExtratoResponseAPI extends SyncPendingFields {
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

export interface PagamentoDetalheAPI {
  // P1-2 Camada 2.2b.2: ISO 8601 (era DD/MM/YYYY).
  data: string | null
  valor: number
  desconto: number
  juros: number
  multa: number
}

export interface LancamentoAPI {
  codigo: number
  favorecido: string
  categoria: string
  // P1-2 Camada 2.2b.2: ISO 8601 (era DD/MM/YYYY).
  data_emissao: string | null
  data_vcto: string | null
  data_previsao: string | null
  data_pagamento: string | null
  valor: number
  valor_pago: number | null
  valor_aberto: number | null
  saldo: number
  status: string  // A VENCER | ATRASADO | PAGO | RECEBIDO | PARCIAL
  numero_documento: string | null
  numero_parcela: string | null
  observacao: string | null
  pagamentos: PagamentoDetalheAPI[]
  projeto_omie_id: string | null
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
  prazo_medio: number
  por_categoria: Array<{ categoria: string; valor: number }>
}

export interface PaginatedResponseAPI extends SyncPendingFields {
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
  entradas_previstas: number
  saidas_previstas: number
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
