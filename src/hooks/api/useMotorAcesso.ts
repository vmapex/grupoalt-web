'use client'
/* ═══════════════════════════════════════════════════════════════
   Integração Motor de Fechamento — SSO + provisionamento (2026-07).

   Consome os endpoints do grupoalt-api (routers/motor.py):
   - GET    /motor/sso-ticket            → { url, expira_em_segundos }
   - GET    /motor/unidades              → [{ id, nome, cidade, uf }]
   - GET    /motor/acesso/{usuarioId}    → MotorAcessoAPI
   - POST   /motor/acesso/{usuarioId}    → concede (cria OU vincula por email)
   - PATCH  /motor/acesso/{usuarioId}    → atualiza perfil/unidades
   - DELETE /motor/acesso/{usuarioId}    → revoga (nunca hard delete no Motor)

   Erros relevantes pro UX:
   - 503 = integração não configurada (envs ausentes — esconder seção)
   - 409 no sso-ticket = sem acesso provisionado (pedir ao admin)
   - 403 no sso-ticket = sem permissão fechamento:ver na empresa-âncora
   ═══════════════════════════════════════════════════════════════ */

import { useApi } from './_core'
import api from '@/lib/api'

export const PERFIS_MOTOR = [
  'ADM',
  'GESTOR_FECHAMENTO',
  'OPERADOR',
  'ANALISTA',
  'EMISSOR_CTE',
] as const

export type PerfilMotor = (typeof PERFIS_MOTOR)[number]

/** Ordena os perfis do Motor do mais fraco ao mais forte — espelho de
 *  MOTOR_RANK em grupoalt-api/app/services/motor_perfil.py. */
export const MOTOR_RANK: Record<string, number> = {
  ANALISTA: 0,
  EMISSOR_CTE: 1,
  OPERADOR: 2,
  GESTOR_FECHAMENTO: 3,
  ADM: 4,
}

/**
 * True quando o SSO vai entrar ABAIXO do perfil provisionado (o backend capa
 * a claim ao teto). Espelha `excede_teto` do motor_perfil.py, incluindo a
 * exceção EMISSOR_CTE (papel sob demanda, nunca é excesso com teto ≥ leitura).
 */
export function ssoRebaixado(perfilMotor: string, teto: string): boolean {
  if (teto === 'NENHUM') return true
  if (perfilMotor === 'EMISSOR_CTE') return false
  return (MOTOR_RANK[perfilMotor] ?? 99) > (MOTOR_RANK[teto] ?? -1)
}

export interface MotorUnidadeAPI {
  id: number
  nome: string
  cidade: string | null
  uf: string | null
}

export interface MotorUsuarioPublicoAPI {
  id: number
  nome: string
  email: string
  perfil: string
  unidade_ids: number[]
  ativo: boolean
}

export interface MotorAcessoAPI {
  provisionado: boolean
  ativo: boolean | null
  motor_user_id: number | null
  perfil_motor: string | null
  unidade_ids: number[] | null
  /** Estado REAL no Motor (read-through) — pode divergir do mapping. */
  motor_estado: MotorUsuarioPublicoAPI | null
  /** Usuário já existente no Motor com o mesmo email (fluxo de adoção). */
  motor_existente_por_email: MotorUsuarioPublicoAPI | null
  perfil_sugerido: PerfilMotor | null
  /** Teto ATUAL pelas permissões RBAC (empresa-âncora). "NENHUM" = SSO
   *  bloqueado (403); abaixo do perfil provisionado = SSO entra rebaixado. */
  teto_atual?: string | null
}

export interface SsoTicketAPI {
  url: string
  expira_em_segundos: number
}

export function useMotorUnidades() {
  return useApi<MotorUnidadeAPI[]>('/motor/unidades')
}

export async function getMotorAcesso(usuarioId: number): Promise<MotorAcessoAPI> {
  const res = await api.get<MotorAcessoAPI>(`/motor/acesso/${usuarioId}`)
  return res.data
}

export async function concederMotorAcesso(
  usuarioId: number,
  perfilMotor: PerfilMotor,
  unidadeIds: number[],
): Promise<MotorAcessoAPI> {
  const res = await api.post<MotorAcessoAPI>(`/motor/acesso/${usuarioId}`, {
    perfil_motor: perfilMotor,
    unidade_ids: unidadeIds,
  })
  return res.data
}

export async function atualizarMotorAcesso(
  usuarioId: number,
  patch: { perfil_motor?: PerfilMotor; unidade_ids?: number[] },
): Promise<MotorAcessoAPI> {
  const res = await api.patch<MotorAcessoAPI>(`/motor/acesso/${usuarioId}`, patch)
  return res.data
}

export async function revogarMotorAcesso(usuarioId: number): Promise<void> {
  await api.delete(`/motor/acesso/${usuarioId}`)
}

export async function getSsoTicket(): Promise<SsoTicketAPI> {
  const res = await api.get<SsoTicketAPI>('/motor/sso-ticket')
  return res.data
}
