'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Settings, Tag, Landmark, Sparkles, AlertCircle,
  CheckCircle2, ShieldAlert, Clock, Users,
} from 'lucide-react'
import { useThemeStore, type ThemeTokens } from '@/store/themeStore'
import { useRequireAdmin } from '@/hooks/useRequireAdmin'
import { AccessDenied } from '@/components/AccessDenied'
import {
  useOrbitAudit,
  useOrbitAuditSummary,
  type OrbitAuditItemAPI,
} from '@/hooks/useAPI'

const STATUS_LABELS: Record<string, { label: string; color: 'green' | 'red' | 'amber' | 'muted' }> = {
  success: { label: 'Sucesso', color: 'green' },
  forbidden: { label: 'Forbidden', color: 'red' },
  not_found: { label: 'Not Found', color: 'amber' },
  payload_too_large: { label: 'Payload', color: 'amber' },
  usage_exceeded: { label: 'Limite diario', color: 'amber' },
  error: { label: 'Erro', color: 'red' },
  rate_limited: { label: 'Rate limit', color: 'amber' },
}

const PAGE_SIZE = 25

function fmtDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yy = String(d.getFullYear()).slice(-2)
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${dd}/${mm}/${yy} ${hh}:${mi}`
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

export default function OrbitAuditPage() {
  const t = useThemeStore((s) => s.tokens)
  const adminAccess = useRequireAdmin()

  const [page, setPage] = useState(0)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [desdeDias, setDesdeDias] = useState(7)

  const summary = useOrbitAuditSummary(desdeDias)
  const audit = useOrbitAudit({
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    audit_status: statusFilter || undefined,
    desde_dias: desdeDias,
  })

  if (adminAccess === 'loading') {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="text-[12px]" style={{ color: t.muted }}>Carregando...</span>
      </div>
    )
  }
  if (adminAccess === 'denied') {
    return <AccessDenied message="O painel de auditoria do Orbit e restrito a administradores." />
  }

  const totalPages = audit.data ? Math.ceil(audit.data.total / PAGE_SIZE) : 0
  const errorRate = summary.data && summary.data.total_requests > 0
    ? ((summary.data.error_requests + summary.data.forbidden_requests) / summary.data.total_requests) * 100
    : 0

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <Sparkles size={22} style={{ color: t.purple }} />
        <h1
          style={{
            fontSize: 20, fontWeight: 700, color: t.text, margin: 0,
            fontFamily: "'DM Sans', system-ui, sans-serif",
          }}
        >
          Orbit IA — Auditoria
        </h1>
      </div>
      <p style={{ fontSize: 13, color: t.textSec, margin: '0 0 16px 0' }}>
        Metadados de cada chamada ao chat (sem conteudo de mensagem). Politica em
        {' '}<code style={{ background: t.surface, padding: '1px 6px', borderRadius: 4 }}>
          docs/plano-acao-seguranca/orbit-policy.md
        </code>.
      </p>

      {/* Sub-navigation tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: `1px solid ${t.border}`, paddingBottom: 12, flexWrap: 'wrap' }}>
        <SubNavLink href="/bi/financeiro/admin" icon={<Settings size={12} />} label="Empresas" t={t} />
        <SubNavLink href="/bi/financeiro/admin/categorias" icon={<Tag size={12} />} label="Plano de Contas" t={t} />
        <SubNavLink href="/bi/financeiro/admin/contas-bancarias" icon={<Landmark size={12} />} label="Contas Bancárias" t={t} />
        <SubNavLink href="/bi/financeiro/admin/orbit" icon={<Sparkles size={12} />} label="Orbit IA" t={t} active />
        <SubNavLink href="/bi/financeiro/admin/usuarios" icon={<Users size={12} />} label="Usuários" t={t} />
      </div>

      {/* Janela de tempo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <span style={{ fontSize: 11, color: t.textSec }}>Janela:</span>
        {[1, 7, 30, 90].map((d) => (
          <button
            key={d}
            onClick={() => { setDesdeDias(d); setPage(0) }}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              background: desdeDias === d ? t.purpleDim : 'transparent',
              border: `1px solid ${desdeDias === d ? `${t.purple}33` : t.border}`,
              color: desdeDias === d ? t.purple : t.textSec,
            }}
          >
            {d === 1 ? '24h' : `${d}d`}
          </button>
        ))}
      </div>

      {/* Cards de metricas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
        <KpiCard
          label="Total de chamadas"
          value={summary.data?.total_requests.toLocaleString('pt-BR') ?? '-'}
          icon={<Sparkles size={14} style={{ color: t.purple }} />}
          loading={summary.loading}
          t={t}
        />
        <KpiCard
          label="Tokens consumidos"
          value={summary.data ? fmtTokens(summary.data.total_tokens) : '-'}
          icon={<CheckCircle2 size={14} style={{ color: t.green }} />}
          loading={summary.loading}
          t={t}
        />
        <KpiCard
          label="Taxa de erro"
          value={summary.data ? `${errorRate.toFixed(1)}%` : '-'}
          icon={<AlertCircle size={14} style={{ color: errorRate > 5 ? t.red : t.muted }} />}
          loading={summary.loading}
          t={t}
          highlight={errorRate > 5}
        />
        <KpiCard
          label="Latencia media"
          value={summary.data ? `${summary.data.avg_duracao_ms} ms` : '-'}
          icon={<Clock size={14} style={{ color: t.blue }} />}
          loading={summary.loading}
          t={t}
        />
        <KpiCard
          label="Tentativas bloqueadas"
          value={summary.data ? String(summary.data.forbidden_requests) : '-'}
          icon={<ShieldAlert size={14} style={{ color: summary.data && summary.data.forbidden_requests > 0 ? t.amber : t.muted }} />}
          loading={summary.loading}
          t={t}
          highlight={!!(summary.data && summary.data.forbidden_requests > 0)}
        />
      </div>

      {/* Top users + Top empresas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16, marginBottom: 24 }}>
        <RankingCard title="Top usuarios" emptyHint="Sem dados na janela" t={t}>
          {summary.data?.top_users.map((u) => (
            <RankingRow
              key={`u-${u.usuario_id ?? 'anon'}`}
              primary={u.usuario_email || u.usuario_nome || `User #${u.usuario_id ?? '-'}`}
              secondary={u.usuario_nome && u.usuario_email ? u.usuario_nome : undefined}
              right={`${fmtTokens(u.tokens_total)} tok / ${u.requests} req`}
              t={t}
            />
          ))}
        </RankingCard>
        <RankingCard title="Top empresas" emptyHint="Sem dados na janela" t={t}>
          {summary.data?.top_empresas.map((e) => (
            <RankingRow
              key={`e-${e.empresa_id ?? 'anon'}`}
              primary={e.empresa_nome || `Empresa #${e.empresa_id ?? '-'}`}
              right={`${fmtTokens(e.tokens_total)} tok / ${e.requests} req`}
              t={t}
            />
          ))}
        </RankingCard>
      </div>

      {/* Filtro de status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: t.textSec }}>Status:</span>
        <button
          onClick={() => { setStatusFilter(''); setPage(0) }}
          style={chipStyle(statusFilter === '', t)}
        >
          Todos
        </button>
        {Object.entries(STATUS_LABELS).map(([key, info]) => (
          <button
            key={key}
            onClick={() => { setStatusFilter(key); setPage(0) }}
            style={chipStyle(statusFilter === key, t)}
          >
            {info.label}
          </button>
        ))}
      </div>

      {/* Tabela de auditoria */}
      <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ background: t.surfaceElevated, color: t.muted, textAlign: 'left' }}>
                <Th>Quando</Th>
                <Th>Usuario</Th>
                <Th>Empresa</Th>
                <Th>Status</Th>
                <Th>Modelo</Th>
                <Th align="right">Tokens</Th>
                <Th align="right">Latencia</Th>
                <Th>Erro</Th>
              </tr>
            </thead>
            <tbody>
              {audit.loading && (
                <tr><td colSpan={8} style={{ padding: 24, textAlign: 'center', color: t.muted }}>Carregando...</td></tr>
              )}
              {audit.error && (
                <tr><td colSpan={8} style={{ padding: 24, textAlign: 'center', color: t.red }}>{audit.error}</td></tr>
              )}
              {!audit.loading && !audit.error && audit.data?.items.length === 0 && (
                <tr><td colSpan={8} style={{ padding: 24, textAlign: 'center', color: t.muted }}>
                  Nenhuma chamada encontrada na janela selecionada.
                </td></tr>
              )}
              {audit.data?.items.map((item) => (
                <AuditRow key={item.id} item={item} t={t} />
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginacao */}
        {audit.data && audit.data.total > PAGE_SIZE && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderTop: `1px solid ${t.border}` }}>
            <span style={{ fontSize: 11, color: t.muted }}>
              {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, audit.data.total)} de {audit.data.total}
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                style={pageBtnStyle(page === 0, t)}
              >
                Anterior
              </button>
              <span style={{ fontSize: 11, color: t.textSec, alignSelf: 'center' }}>
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page + 1 >= totalPages}
                style={pageBtnStyle(page + 1 >= totalPages, t)}
              >
                Proxima
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Sub-componentes ────────────────────────────────────────── */

function SubNavLink({
  href, icon, label, active = false, t,
}: {
  href: string; icon: React.ReactNode; label: string; active?: boolean; t: ThemeTokens
}) {
  return (
    <Link
      href={href}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 12px',
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 600,
        color: active ? t.purple : t.muted,
        background: active ? t.purpleDim : 'transparent',
        border: `1px solid ${active ? `${t.purple}33` : t.border}`,
        textDecoration: 'none',
      }}
    >
      {icon}
      {label}
    </Link>
  )
}

function KpiCard({
  label, value, icon, loading, t, highlight = false,
}: {
  label: string; value: string; icon: React.ReactNode; loading: boolean
  t: ThemeTokens; highlight?: boolean
}) {
  return (
    <div
      style={{
        background: t.surface,
        border: `1px solid ${highlight ? `${t.amber}33` : t.border}`,
        borderRadius: 10,
        padding: 14,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        {icon}
        <span style={{ fontSize: 10, color: t.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: t.text, fontFamily: "'JetBrains Mono', monospace" }}>
        {loading ? '...' : value}
      </div>
    </div>
  )
}

function RankingCard({
  title, children, emptyHint, t,
}: {
  title: string; children: React.ReactNode; emptyHint: string; t: ThemeTokens
}) {
  const childrenArray = Array.isArray(children) ? children.filter(Boolean) : (children ? [children] : [])
  return (
    <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: t.textSec, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {title}
      </div>
      {childrenArray.length === 0 ? (
        <div style={{ fontSize: 11, color: t.muted, padding: '8px 0' }}>{emptyHint}</div>
      ) : children}
    </div>
  )
}

function RankingRow({
  primary, secondary, right, t,
}: {
  primary: string; secondary?: string; right: string; t: ThemeTokens
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px dashed ${t.border}` }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 12, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {primary}
        </div>
        {secondary && (
          <div style={{ fontSize: 10, color: t.muted }}>{secondary}</div>
        )}
      </div>
      <span style={{ fontSize: 11, color: t.textSec, fontFamily: "'JetBrains Mono', monospace", marginLeft: 12 }}>
        {right}
      </span>
    </div>
  )
}

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <th style={{
      padding: '8px 12px', fontWeight: 600, fontSize: 10, textTransform: 'uppercase',
      letterSpacing: 0.5, textAlign: align, whiteSpace: 'nowrap',
    }}>
      {children}
    </th>
  )
}

function AuditRow({ item, t }: { item: OrbitAuditItemAPI; t: ThemeTokens }) {
  const statusInfo = STATUS_LABELS[item.status] ?? { label: item.status, color: 'muted' as const }
  const colorMap = {
    green: { bg: t.greenDim, fg: t.green },
    red: { bg: t.redDim, fg: t.red },
    amber: { bg: t.amberDim, fg: t.amber },
    muted: { bg: t.surfaceElevated, fg: t.muted },
  }
  const c = colorMap[statusInfo.color]
  return (
    <tr style={{ borderTop: `1px solid ${t.border}`, color: t.text }}>
      <td style={{ padding: '8px 12px', whiteSpace: 'nowrap', fontFamily: "'JetBrains Mono', monospace", color: t.textSec }}>
        {fmtDate(item.criado_em)}
      </td>
      <td style={{ padding: '8px 12px', minWidth: 160 }}>
        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.usuario_email || item.usuario_nome || `#${item.usuario_id ?? '?'}`}
        </div>
      </td>
      <td style={{ padding: '8px 12px', color: t.textSec }}>
        {item.empresa_nome || (item.empresa_id ? `#${item.empresa_id}` : '-')}
      </td>
      <td style={{ padding: '8px 12px' }}>
        <span style={{
          background: c.bg, color: c.fg,
          padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 600,
        }}>
          {statusInfo.label}
        </span>
      </td>
      <td style={{ padding: '8px 12px', color: t.textSec, fontSize: 10 }}>
        {item.modelo ? item.modelo.split('-').slice(0, 2).join('-') : '-'}
      </td>
      <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace" }}>
        {item.tokens_total > 0 ? fmtTokens(item.tokens_total) : '-'}
      </td>
      <td style={{ padding: '8px 12px', textAlign: 'right', color: t.textSec, fontFamily: "'JetBrains Mono', monospace" }}>
        {item.duracao_ms} ms
      </td>
      <td style={{ padding: '8px 12px', color: t.red, fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}>
        {item.error_type || '-'}
      </td>
    </tr>
  )
}

function chipStyle(active: boolean, t: ThemeTokens): React.CSSProperties {
  return {
    padding: '4px 10px',
    borderRadius: 6,
    fontSize: 10,
    fontWeight: 600,
    cursor: 'pointer',
    background: active ? t.blueDim : 'transparent',
    border: `1px solid ${active ? `${t.blue}33` : t.border}`,
    color: active ? t.blue : t.textSec,
  }
}

function pageBtnStyle(disabled: boolean, t: ThemeTokens): React.CSSProperties {
  return {
    padding: '6px 12px',
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    background: t.surface,
    border: `1px solid ${t.border}`,
    color: disabled ? t.muted : t.textSec,
    opacity: disabled ? 0.5 : 1,
  }
}
