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
