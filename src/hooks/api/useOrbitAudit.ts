'use client'
import { useApi } from './_core'

export interface OrbitAuditItemAPI {
  id: number
  request_id: string
  usuario_id: number | null
  usuario_nome: string | null
  usuario_email: string | null
  empresa_id: number | null
  empresa_nome: string | null
  classificacao: string
  modelo: string
  msg_count: number
  user_msg_chars: number
  tokens_input: number
  tokens_output: number
  tokens_total: number
  status: string
  error_type: string | null
  duracao_ms: number
  ip: string | null
  criado_em: string
}

export interface OrbitAuditPageAPI {
  items: OrbitAuditItemAPI[]
  total: number
  limit: number
  offset: number
}

export interface OrbitAuditTopUserAPI {
  usuario_id: number | null
  usuario_nome: string | null
  usuario_email: string | null
  requests: number
  tokens_total: number
}

export interface OrbitAuditTopEmpresaAPI {
  empresa_id: number | null
  empresa_nome: string | null
  requests: number
  tokens_total: number
}

export interface OrbitAuditStatusBucketAPI {
  status: string
  requests: number
}

export interface OrbitAuditSummaryAPI {
  desde_dias: number
  total_requests: number
  total_tokens: number
  success_requests: number
  error_requests: number
  rate_limited_requests: number
  forbidden_requests: number
  avg_duracao_ms: number
  by_status: OrbitAuditStatusBucketAPI[]
  top_users: OrbitAuditTopUserAPI[]
  top_empresas: OrbitAuditTopEmpresaAPI[]
}

export interface OrbitAuditFilters {
  limit?: number
  offset?: number
  usuario_id?: number
  empresa_id?: number
  audit_status?: string
  desde_dias?: number
}

export function useOrbitAudit(filters: OrbitAuditFilters = {}) {
  return useApi<OrbitAuditPageAPI>('/orbit/audit', {
    limit: filters.limit,
    offset: filters.offset,
    usuario_id: filters.usuario_id,
    empresa_id: filters.empresa_id,
    audit_status: filters.audit_status,
    desde_dias: filters.desde_dias,
  })
}

export function useOrbitAuditSummary(desdeDias: number = 7) {
  return useApi<OrbitAuditSummaryAPI>('/orbit/audit/summary', {
    desde_dias: desdeDias,
  })
}
