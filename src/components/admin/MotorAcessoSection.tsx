'use client'
/* ═══════════════════════════════════════════════════════════════
   Seção "Acesso ao Motor de Fechamento" do detalhe de usuário
   (/bi/financeiro/admin/usuarios) — integração SSO 2026-07.

   O portal é o master do provisionamento: conceder cria o usuário no
   Motor (ou VINCULA um existente com o mesmo email — adoção), atualizar
   faz PATCH lá, revogar desativa (nunca hard delete). O backend
   (routers/motor.py) é a autoridade; aqui é só apresentação.

   Com a integração desconfigurada (503), a seção mostra uma linha
   informativa e nada mais.
   ═══════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useState } from 'react'
import { GitCompare, Link2, Loader2, ShieldOff, UserPlus } from 'lucide-react'
import type { useThemeStore } from '@/store/themeStore'
import {
  atualizarMotorAcesso,
  concederMotorAcesso,
  getMotorAcesso,
  revogarMotorAcesso,
  ssoRebaixado,
  useMotorUnidades,
  PERFIS_MOTOR,
  type MotorAcessoAPI,
  type PerfilMotor,
} from '@/hooks/api/useMotorAcesso'

type ThemeTokens = ReturnType<typeof useThemeStore.getState>['tokens']

interface Props {
  usuarioId: number
  usuarioNome: string
  t: ThemeTokens
  /** Incrementado pela página quando os perfis RBAC do usuário mudam —
   *  recarrega o estado (o teto do SSO deriva deles). */
  refreshKey?: number
}

type Estado =
  | { fase: 'carregando' }
  | { fase: 'desconfigurado' }
  | { fase: 'erro'; msg: string }
  | { fase: 'pronto'; acesso: MotorAcessoAPI }

function extrairErro(err: unknown): { status?: number; msg: string } {
  const e = err as { response?: { status?: number; data?: { detail?: string } }; message?: string }
  return {
    status: e?.response?.status,
    msg: e?.response?.data?.detail || e?.message || 'Erro inesperado',
  }
}

export function MotorAcessoSection({ usuarioId, usuarioNome, t, refreshKey }: Props) {
  const [estado, setEstado] = useState<Estado>({ fase: 'carregando' })
  const [perfil, setPerfil] = useState<PerfilMotor>('ANALISTA')
  const [unidades, setUnidades] = useState<Set<number>>(() => new Set())
  const [salvando, setSalvando] = useState(false)
  const [erroAcao, setErroAcao] = useState<string | null>(null)

  const unidadesResult = useMotorUnidades()
  const unidadesMotor = unidadesResult.data ?? []

  const carregar = useCallback(async () => {
    setEstado({ fase: 'carregando' })
    setErroAcao(null)
    try {
      const acesso = await getMotorAcesso(usuarioId)
      setEstado({ fase: 'pronto', acesso })
      const perfilInicial =
        (acesso.perfil_motor as PerfilMotor | null) ??
        acesso.perfil_sugerido ??
        (acesso.motor_existente_por_email?.perfil as PerfilMotor | undefined) ??
        'ANALISTA'
      setPerfil(PERFIS_MOTOR.includes(perfilInicial) ? perfilInicial : 'ANALISTA')
      setUnidades(new Set(acesso.unidade_ids ?? acesso.motor_existente_por_email?.unidade_ids ?? []))
    } catch (err: unknown) {
      const { status, msg } = extrairErro(err)
      if (status === 503) setEstado({ fase: 'desconfigurado' })
      else setEstado({ fase: 'erro', msg })
    }
  }, [usuarioId])

  useEffect(() => {
    void carregar()
  }, [carregar, refreshKey])

  const toggleUnidade = (id: number) => {
    setUnidades((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const executar = async (fn: () => Promise<unknown>) => {
    setSalvando(true)
    setErroAcao(null)
    try {
      await fn()
      await carregar()
    } catch (err: unknown) {
      setErroAcao(extrairErro(err).msg)
    } finally {
      setSalvando(false)
    }
  }

  const conceder = () =>
    executar(() => concederMotorAcesso(usuarioId, perfil, Array.from(unidades)))

  const atualizar = () =>
    executar(() => atualizarMotorAcesso(usuarioId, {
      perfil_motor: perfil,
      unidade_ids: Array.from(unidades),
    }))

  const revogar = () => {
    if (!confirm(
      `Revogar o acesso de ${usuarioNome} ao Motor de Fechamento?\n\n` +
      'O usuário é DESATIVADO no Motor (sessões caem no próximo request) ' +
      'e o SSO passa a ser recusado. Reversível: conceda de novo.'
    )) return
    void executar(() => revogarMotorAcesso(usuarioId))
  }

  // ── Render ──────────────────────────────────────────────────────────────

  const titulo = (
    <h3 style={{
      fontSize: 13, fontWeight: 600, margin: '20px 0 10px 0', color: t.text,
      display: 'flex', alignItems: 'center', gap: 6,
      borderTop: `1px solid ${t.border}`, paddingTop: 16,
    }}>
      <GitCompare size={14} style={{ color: t.gold }} />
      Acesso ao Motor de Fechamento
    </h3>
  )

  if (estado.fase === 'desconfigurado') {
    return (
      <div>
        {titulo}
        <div style={{ fontSize: 11, color: t.muted }}>
          Integração com o Motor não configurada neste ambiente.
        </div>
      </div>
    )
  }

  if (estado.fase === 'carregando') {
    return (
      <div>
        {titulo}
        <div style={{ fontSize: 11, color: t.muted, display: 'flex', gap: 6, alignItems: 'center' }}>
          <Loader2 size={12} className="animate-spin" /> Consultando o Motor...
        </div>
      </div>
    )
  }

  if (estado.fase === 'erro') {
    return (
      <div>
        {titulo}
        <div style={{
          fontSize: 11, color: '#fca5a5', padding: 8,
          background: '#7f1d1d22', border: '1px solid #f8717155', borderRadius: 6,
        }}>
          {estado.msg}{' '}
          <button onClick={() => void carregar()} style={{
            background: 'transparent', border: 'none', color: 'inherit',
            textDecoration: 'underline', cursor: 'pointer', padding: 0,
          }}>
            Tentar de novo
          </button>
        </div>
      </div>
    )
  }

  const { acesso } = estado
  const adocao = !acesso.provisionado && acesso.motor_existente_por_email
  const divergente =
    acesso.provisionado && acesso.motor_estado &&
    (acesso.motor_estado.perfil !== acesso.perfil_motor ||
      acesso.motor_estado.ativo !== acesso.ativo)

  // Diagnóstico do "perfil reseta acesso" (2026-07-24): o teto do SSO deriva
  // dos perfis RBAC e pode ter mudado DEPOIS do provisionamento. Sem estes
  // avisos o efeito só aparece no próximo SSO do usuário (403 ou perfil
  // rebaixado persistido no Motor) e parece perda de acesso aleatória.
  const teto = acesso.teto_atual ?? null
  const acessoAtivo = Boolean(acesso.provisionado && acesso.ativo)
  const ssoBloqueado = acessoAtivo && teto === 'NENHUM'
  const rebaixado =
    acessoAtivo && teto != null && teto !== 'NENHUM' &&
    acesso.perfil_motor != null && ssoRebaixado(acesso.perfil_motor, teto)

  return (
    <div>
      {titulo}

      {ssoBloqueado && (
        <div role="alert" style={{
          fontSize: 11, padding: '8px 10px', borderRadius: 6, marginBottom: 10,
          background: t.redDim, border: `1px solid ${t.red}55`, color: t.red,
        }}>
          🚫 <strong>SSO bloqueado</strong>: os perfis RBAC atuais não incluem{' '}
          <code>fechamento:ver</code> na empresa-âncora — o próximo acesso ao Motor
          responde 403. Usuário provisionado via SSO não tem senha local no Motor:
          restaure um perfil RBAC com <code>fechamento:ver</code> (ou revogue o
          acesso aqui) em vez de resetar a senha lá.
        </div>
      )}

      {rebaixado && (
        <div role="alert" style={{
          fontSize: 11, padding: '8px 10px', borderRadius: 6, marginBottom: 10,
          background: `${t.amber}14`, border: `1px solid ${t.amber}55`, color: t.amber,
        }}>
          ⚠ O SSO vai entrar como <strong>{teto}</strong>, não como{' '}
          <strong>{acesso.perfil_motor}</strong>: as permissões RBAC atuais só
          justificam {teto} e o Motor adota (e persiste) o perfil do ticket. Para
          restaurar {acesso.perfil_motor}, ajuste os perfis RBAC acima.
        </div>
      )}

      {/* Status atual */}
      {acesso.provisionado ? (
        <div style={{
          fontSize: 11, padding: '8px 10px', borderRadius: 6, marginBottom: 10,
          background: acesso.ativo ? t.greenDim : t.redDim,
          border: `1px solid ${acesso.ativo ? t.green : t.red}33`,
          color: acesso.ativo ? t.green : t.red,
        }}>
          {acesso.ativo ? 'Acesso ATIVO' : 'Acesso REVOGADO'} · perfil{' '}
          <strong>{acesso.perfil_motor}</strong> · motor_user_id {acesso.motor_user_id}
          {divergente && (
            <div style={{ marginTop: 4, color: t.amber }}>
              ⚠ Estado no Motor diverge do portal (lá:{' '}
              {acesso.motor_estado?.perfil}, {acesso.motor_estado?.ativo ? 'ativo' : 'inativo'}).
              Salvar aqui sobrescreve.
            </div>
          )}
        </div>
      ) : adocao ? (
        <div style={{
          fontSize: 11, padding: '8px 10px', borderRadius: 6, marginBottom: 10,
          background: t.blueDim, border: `1px solid ${t.blue}33`, color: t.blue,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <Link2 size={12} />
          Já existe usuário no Motor com este email ({acesso.motor_existente_por_email?.nome},
          perfil {acesso.motor_existente_por_email?.perfil}) — conceder VINCULA a conta
          existente em vez de criar outra.
        </div>
      ) : (
        <div style={{ fontSize: 11, color: t.muted, marginBottom: 10 }}>
          Sem acesso ao Motor. Escolha perfil e unidades pra conceder.
        </div>
      )}

      {/* Formulário perfil + unidades */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 10, color: t.muted, marginBottom: 4 }}>
            Perfil no Motor
            {acesso.perfil_sugerido && !acesso.provisionado && (
              <span style={{ color: t.mutedDim }}> (sugerido: {acesso.perfil_sugerido})</span>
            )}
          </div>
          <select
            value={perfil}
            onChange={(e) => setPerfil(e.target.value as PerfilMotor)}
            aria-label="Perfil no Motor"
            style={{
              padding: '7px 10px', borderRadius: 6, fontSize: 12,
              background: t.bg, color: t.text, border: `1px solid ${t.border}`,
            }}
          >
            {PERFIS_MOTOR.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontSize: 10, color: t.muted, marginBottom: 4 }}>Unidades</div>
          {unidadesResult.loading && (
            <span style={{ fontSize: 11, color: t.muted }}>Carregando...</span>
          )}
          {!unidadesResult.loading && unidadesMotor.length === 0 && (
            <span style={{ fontSize: 11, color: t.muted }}>Nenhuma unidade disponível.</span>
          )}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {unidadesMotor.map((u) => (
              <label key={u.id} style={{
                display: 'flex', alignItems: 'center', gap: 4,
                fontSize: 11, color: t.textSec, cursor: 'pointer', userSelect: 'none',
              }}>
                <input
                  type="checkbox"
                  checked={unidades.has(u.id)}
                  onChange={() => toggleUnidade(u.id)}
                />
                {u.nome}
              </label>
            ))}
          </div>
        </div>
      </div>

      {erroAcao && (
        <div role="alert" style={{
          marginTop: 8, padding: 8, fontSize: 11, borderRadius: 6,
          background: '#7f1d1d22', border: '1px solid #f8717155', color: '#fca5a5',
        }}>
          {erroAcao}
        </div>
      )}

      {/* Ações */}
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        {acesso.provisionado && acesso.ativo ? (
          <>
            <button
              onClick={() => void atualizar()}
              disabled={salvando}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                background: t.blue, color: '#fff', border: 'none',
                cursor: salvando ? 'wait' : 'pointer', opacity: salvando ? 0.6 : 1,
              }}
            >
              {salvando ? <Loader2 size={12} className="animate-spin" /> : null}
              Salvar alterações
            </button>
            <button
              onClick={revogar}
              disabled={salvando}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                background: 'transparent', color: t.red,
                border: `1px solid ${t.red}55`,
                cursor: salvando ? 'wait' : 'pointer',
              }}
            >
              <ShieldOff size={12} /> Revogar acesso
            </button>
          </>
        ) : (
          <button
            onClick={() => void conceder()}
            disabled={salvando}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600,
              background: t.blue, color: '#fff', border: 'none',
              cursor: salvando ? 'wait' : 'pointer', opacity: salvando ? 0.6 : 1,
            }}
          >
            {salvando
              ? <Loader2 size={12} className="animate-spin" />
              : adocao ? <Link2 size={12} /> : <UserPlus size={12} />}
            {adocao ? 'Vincular usuário existente' : acesso.provisionado ? 'Reativar acesso' : 'Conceder acesso'}
          </button>
        )}
      </div>
    </div>
  )
}
