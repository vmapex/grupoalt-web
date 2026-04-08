'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore } from '@/store/themeStore'
import Link from 'next/link'
import api from '@/lib/api'
import {
  DollarSign, TrendingUp, TrendingDown, AlertTriangle,
  Receipt, BarChart3, Users, FileText,
  ArrowUpRight, ArrowDownRight, Loader2,
} from 'lucide-react'

interface DashboardKPI {
  label: string
  value: number
  formatted: string
  change: string | null
  up: boolean | null
}

interface Vencimento {
  favorecido: string
  valor: number
  data_vcto: string
  status: string
  categoria: string | null
}

interface DashboardData {
  kpis: DashboardKPI[]
  cp: { total_aberto: number; total_a_vencer: number; total_atrasado: number; quantidade_aberto: number; quantidade_atrasado: number }
  cr: { total_aberto: number; total_a_vencer: number; total_atrasado: number; quantidade_aberto: number; quantidade_a_vencer: number }
  proximos_vencimentos: Vencimento[]
  saldo_contas: number
  total_contas: number
}

const fmtBRL = (v: number) => {
  const abs = Math.abs(v)
  if (abs >= 1_000_000) return `R$ ${(v / 1_000_000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`
  if (abs >= 1_000) return `R$ ${(v / 1_000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}K`
  return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const kpiConfig = [
  { icon: TrendingUp, color: '#34D399', bg: 'rgba(52,211,153,0.1)' },
  { icon: TrendingDown, color: '#F87171', bg: 'rgba(248,113,113,0.1)' },
  { icon: DollarSign, color: '#60A5FA', bg: 'rgba(96,165,250,0.1)' },
  { icon: AlertTriangle, color: '#FBBF24', bg: 'rgba(251,191,36,0.1)' },
]

const quickActions = [
  { icon: Receipt, color: '#60A5FA', bg: 'rgba(96,165,250,0.1)', title: 'Contas a Pagar', desc: 'Gestao CP', href: '/portal/financeiro/cp' },
  { icon: FileText, color: '#34D399', bg: 'rgba(52,211,153,0.1)', title: 'Contas a Receber', desc: 'Gestao CR', href: '/portal/financeiro/cr' },
  { icon: BarChart3, color: '#CCA000', bg: 'rgba(204,160,0,0.1)', title: 'Extrato', desc: 'Extrato bancario', href: '/portal/financeiro/extrato' },
  { icon: Users, color: '#A1A1AA', bg: 'rgba(161,161,170,0.1)', title: 'Fluxo de Caixa', desc: 'Projecao futura', href: '/portal/financeiro/fluxo' },
]

export default function DashboardPage() {
  const { grupoAtivo, empresaAtiva } = useAuthStore()
  const t = useThemeStore((s) => s.tokens)
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hoveredAction, setHoveredAction] = useState<string | null>(null)

  useEffect(() => {
    const empresaId = empresaAtiva?.id
    if (!empresaId) {
      setLoading(false)
      setError('Nenhuma empresa selecionada. Configure uma empresa no painel Admin.')
      return
    }

    setLoading(true)
    setError(null)

    api.get(`/empresas/${empresaId}/dashboard`)
      .then((res) => {
        setData(res.data)
        setLoading(false)
      })
      .catch((err) => {
        const status = err?.response?.status
        const detail = err?.response?.data?.detail || err.message
        if (status === 422) {
          setError('Credenciais Omie nao configuradas para esta empresa. Acesse Admin > Empresas para configurar.')
        } else {
          setError(`Erro ao carregar dashboard: ${detail}`)
        }
        setLoading(false)
      })
  }, [empresaAtiva?.id])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex items-center gap-3" style={{ color: t.muted }}>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Carregando dados da Omie...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="rounded-2xl p-8 max-w-md text-center" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
          <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2" style={{ color: t.text }}>Dados indisponiveis</h2>
          <p className="text-sm leading-relaxed" style={{ color: t.muted }}>{error}</p>
          <Link href="/portal/admin" className="inline-block mt-4 text-sm text-[#E0B82E] hover:text-[#CCA000] font-medium">
            Ir para Admin
          </Link>
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight mb-1" style={{ color: t.text }}>Dashboard</h1>
            <p className="text-sm" style={{ color: t.muted }}>
              Visao geral — {empresaAtiva?.nome || grupoAtivo?.nome || 'Grupo ALT'}
            </p>
          </div>
        </div>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {data.kpis.map((kpi, i) => {
          const cfg = kpiConfig[i] || kpiConfig[0]
          const Icon = cfg.icon
          return (
            <div key={kpi.label} className="rounded-2xl p-5 transition-all" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium uppercase tracking-wider" style={{ color: t.muted }}>{kpi.label}</span>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: cfg.bg }}>
                  <Icon className="w-4 h-4" style={{ color: cfg.color }} />
                </div>
              </div>
              <div className="text-2xl font-semibold mb-1" style={{ color: t.text }}>{kpi.formatted}</div>
              {kpi.change && (
                <div className={`flex items-center gap-1 text-xs font-medium ${kpi.up ? 'text-emerald-400' : 'text-red-400'}`}>
                  {kpi.up ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                  {kpi.change}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* CP/CR Summary (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          {/* CP and CR cards side by side */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Contas a Pagar */}
            <Link href="/portal/financeiro/cp" className="rounded-2xl p-6 transition-all group" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
              <h3 className="text-xs font-medium uppercase tracking-wider mb-4" style={{ color: t.muted }}>Contas a Pagar</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm" style={{ color: t.muted }}>Total Aberto</span>
                  <span className="text-lg font-semibold font-mono" style={{ color: t.text }}>{fmtBRL(data.cp.total_aberto)}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-sm" style={{ color: t.muted }}>A Vencer</span>
                  <span className="text-sm text-amber-400 font-mono">{fmtBRL(data.cp.total_a_vencer)}</span>
                </div>
                {data.cp.total_atrasado > 0 && (
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm" style={{ color: t.muted }}>Atrasado</span>
                    <span className="text-sm text-red-400 font-mono">{fmtBRL(data.cp.total_atrasado)}</span>
                  </div>
                )}
                <div className="pt-2" style={{ borderTop: `1px solid ${t.border}` }}>
                  <span className="text-xs" style={{ color: t.muted }}>{data.cp.quantidade_aberto} titulo(s) aberto(s)</span>
                  {data.cp.quantidade_atrasado > 0 && (
                    <span className="text-xs text-red-400 ml-2">({data.cp.quantidade_atrasado} atrasado(s))</span>
                  )}
                </div>
              </div>
            </Link>

            {/* Contas a Receber */}
            <Link href="/portal/financeiro/cr" className="rounded-2xl p-6 transition-all group" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
              <h3 className="text-xs font-medium uppercase tracking-wider mb-4" style={{ color: t.muted }}>Contas a Receber</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm" style={{ color: t.muted }}>Total Aberto</span>
                  <span className="text-lg font-semibold font-mono" style={{ color: t.text }}>{fmtBRL(data.cr.total_aberto)}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-sm" style={{ color: t.muted }}>A Vencer</span>
                  <span className="text-sm text-emerald-400 font-mono">{fmtBRL(data.cr.total_a_vencer)}</span>
                </div>
                {data.cr.total_atrasado > 0 && (
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm" style={{ color: t.muted }}>Atrasado</span>
                    <span className="text-sm text-red-400 font-mono">{fmtBRL(data.cr.total_atrasado)}</span>
                  </div>
                )}
                <div className="pt-2" style={{ borderTop: `1px solid ${t.border}` }}>
                  <span className="text-xs" style={{ color: t.muted }}>{data.cr.quantidade_aberto} titulo(s) aberto(s)</span>
                </div>
              </div>
            </Link>
          </div>

          {/* Próximos Vencimentos */}
          <div className="rounded-2xl p-6" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold" style={{ color: t.text }}>Proximos Vencimentos</h3>
              <Link href="/portal/financeiro/cp" className="text-xs text-[#E0B82E] hover:text-[#CCA000] font-medium transition-colors">
                Ver todos
              </Link>
            </div>
            {data.proximos_vencimentos.length === 0 ? (
              <p className="text-sm" style={{ color: t.muted }}>Nenhum vencimento proximo.</p>
            ) : (
              <div className="space-y-0">
                {data.proximos_vencimentos.slice(0, 6).map((v, i) => {
                  const parts = v.data_vcto.split('/')
                  const dia = parts[0] || '--'
                  const mesNum = parseInt(parts[1] || '0')
                  const meses = ['', 'JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ']
                  const mes = meses[mesNum] || '--'
                  const isAtrasado = v.status === 'ATRASADO'
                  const color = isAtrasado ? '#F87171' : '#FBBF24'
                  const bg = isAtrasado ? 'rgba(248,113,113,0.1)' : 'rgba(251,191,36,0.1)'
                  const border = isAtrasado ? 'rgba(248,113,113,0.2)' : 'rgba(251,191,36,0.2)'

                  return (
                    <div key={i} className={`flex items-center gap-3 py-3`} style={i < data.proximos_vencimentos.length - 1 && i < 5 ? { borderBottom: `1px solid ${t.border}` } : undefined}>
                      <div className="w-10 h-10 rounded-xl flex flex-col items-center justify-center flex-shrink-0" style={{ background: bg, border: `1px solid ${border}` }}>
                        <span className="text-[10px] font-medium leading-none" style={{ color }}>{mes}</span>
                        <span className="text-sm font-bold leading-tight" style={{ color }}>{dia}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: t.text }}>{v.favorecido}</p>
                        <p className="text-xs" style={{ color: t.muted }}>{v.categoria || 'Sem categoria'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-mono" style={{ color: t.text }}>{fmtBRL(v.valor)}</p>
                        {isAtrasado && <span className="text-[10px] text-red-400 font-medium">ATRASADO</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel */}
        <div className="space-y-4">
          {/* Quick Actions */}
          <div className="rounded-2xl p-6" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
            <h3 className="text-base font-semibold mb-5" style={{ color: t.text }}>Acesso Rapido</h3>
            <div className="space-y-1">
              {quickActions.map((action) => {
                const Icon = action.icon
                const isHovered = hoveredAction === action.href
                return (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="flex items-center gap-3 p-3 rounded-xl transition-colors group"
                    style={{ background: isHovered ? t.surfaceHover : 'transparent' }}
                    onMouseEnter={() => setHoveredAction(action.href)}
                    onMouseLeave={() => setHoveredAction(null)}
                  >
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: action.bg }}>
                      <Icon className="w-4 h-4" style={{ color: action.color }} />
                    </div>
                    <div>
                      <div className="text-sm font-medium transition-colors" style={{ color: isHovered ? t.text : t.textSec }}>{action.title}</div>
                      <div className="text-xs" style={{ color: t.muted }}>{action.desc}</div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Contas Bancarias summary */}
          <div className="rounded-2xl p-6" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
            <h3 className="text-base font-semibold mb-3" style={{ color: t.text }}>Contas Bancarias</h3>
            <div className="text-3xl font-semibold font-mono mb-1" style={{ color: t.text }}>{data.total_contas}</div>
            <p className="text-xs" style={{ color: t.muted }}>contas ativas no Omie</p>
            <Link href="/portal/financeiro/extrato" className="inline-block mt-3 text-xs text-[#E0B82E] hover:text-[#CCA000] font-medium transition-colors">
              Ver extrato completo
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
