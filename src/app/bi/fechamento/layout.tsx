'use client'
/* ═══════════════════════════════════════════════════════════════
   BI de Fechamento — shell dedicado /bi/fechamento (espelho do shell
   do /bi/motor): auth guard + aurora + barra própria com os filtros
   globais do Power BI de referência (ANO · MÊS · QUINZENA/DEZENA ·
   NAVIO · UNIDADE) e sub-bar de abas por rota:

     Faturamento              · /bi/fechamento
     Faturamento 5 anos       · /bi/fechamento/faturamento-5-anos
     Custo × Faturamento      · /bi/fechamento/custo-fat
     Agregados & Postos       · /bi/fechamento/agregados
     Adiantamentos & Devedores· /bi/fechamento/adiantamentos-devedores
     Crédito & Débito         · /bi/fechamento/credito-debito

   Opções de filtro DINÂMICAS via GET /fechamento-bi/filtros (unidades,
   navios e anos descobertos do Motor — nada hardcoded; o dashboard
   funciona para N unidades). Gate fechamento:bi na casca inteira
   (PermissionGate; o gate real é o has_permission do backend).
   ═══════════════════════════════════════════════════════════════ */
import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import {
  BarChart3, History, TrendingDown, Fuel, HandCoins, ArrowLeftRight, ArrowLeft,
} from 'lucide-react'
import { useThemeStore } from '@/store/themeStore'
import { useEmpresaStore } from '@/store/empresaStore'
import { useAuthStore } from '@/store/authStore'
import { useBiFechamentoStore, PERIODO_INTRA_MES_OPTS } from '@/store/biFechamentoStore'
import { useFechamentoBiFiltros } from '@/hooks/api/useFechamentoBi'
import { useFetchPermissoesAtivas } from '@/hooks/usePermission'
import { PermissionGate } from '@/components/auth/PermissionGate'
import api from '@/lib/api'
import { MESES } from './_shared'

const TABS = [
  { href: '/bi/fechamento', label: 'Faturamento', Icon: BarChart3 },
  { href: '/bi/fechamento/faturamento-5-anos', label: 'Faturamento 5 anos', Icon: History },
  { href: '/bi/fechamento/custo-fat', label: 'Custo × Faturamento', Icon: TrendingDown },
  { href: '/bi/fechamento/agregados', label: 'Agregados & Postos', Icon: Fuel },
  { href: '/bi/fechamento/adiantamentos-devedores', label: 'Adiant. & Devedores', Icon: HandCoins },
  { href: '/bi/fechamento/credito-debito', label: 'Crédito & Débito', Icon: ArrowLeftRight },
]

function AcessoRestrito() {
  const t = useThemeStore((s) => s.tokens)
  return (
    <div className="max-w-lg mx-auto mt-16 rounded-xl p-8 text-center" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
      <div className="text-sm" style={{ color: t.textSec }}>
        Acesso restrito — o BI de Fechamento exige a permissão <span style={{ color: t.gold }}>fechamento:bi</span>.
      </div>
      <div className="text-xs mt-2" style={{ color: t.muted }}>
        Solicite ao administrador no cadastro de perfis do portal.
      </div>
    </div>
  )
}

export default function BIFechamentoLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { mode, tokens: t } = useThemeStore()
  const syncFromAuth = useEmpresaStore((s) => s.syncFromAuth)
  const synced = useEmpresaStore((s) => s._synced)
  const setAuth = useAuthStore((s) => s.setAuth)
  const user = useAuthStore((s) => s.user)

  const ano = useBiFechamentoStore((s) => s.ano)
  const mes = useBiFechamentoStore((s) => s.mes)
  const periodo = useBiFechamentoStore((s) => s.periodo)
  const navioId = useBiFechamentoStore((s) => s.navioId)
  const unidadeId = useBiFechamentoStore((s) => s.unidadeId)
  const anoOpts = useBiFechamentoStore((s) => s.anoOpts)
  const unidadeOpts = useBiFechamentoStore((s) => s.unidadeOpts)
  const navioOpts = useBiFechamentoStore((s) => s.navioOpts)
  const setAno = useBiFechamentoStore((s) => s.setAno)
  const setMes = useBiFechamentoStore((s) => s.setMes)
  const setPeriodo = useBiFechamentoStore((s) => s.setPeriodo)
  const setNavioId = useBiFechamentoStore((s) => s.setNavioId)
  const setUnidadeId = useBiFechamentoStore((s) => s.setUnidadeId)
  const setOpts = useBiFechamentoStore((s) => s.setOpts)

  useFetchPermissoesAtivas()
  const { data: filtros } = useFechamentoBiFiltros()

  // Auth guard — mesmo padrão dos shells /bi/financeiro e /bi/motor.
  useEffect(() => {
    if (!user) {
      api.get('/auth/me')
        .then((res) => {
          const d = res.data
          setAuth(d.user || d, d.empresas || [], d.grupos || [])
        })
        .catch(() => router.push('/login'))
    }
  }, [router, user, setAuth])

  useEffect(() => {
    if (user && !synced) syncFromAuth()
  }, [user, synced, syncFromAuth])

  useEffect(() => {
    const root = document.documentElement
    if (mode === 'dark') root.classList.add('dark')
    else root.classList.remove('dark')
  }, [mode])

  // Opções dinâmicas de filtro descobertas da API do Motor.
  useEffect(() => {
    if (!filtros) return
    const comFechamento = new Set(filtros.navios_com_fechamento || [])
    setOpts({
      anos: filtros.anos || [],
      unidades: (filtros.unidades || []).map((u) => ({ id: u.id, label: u.nome })),
      navios: (filtros.navios || [])
        .filter((n) => comFechamento.size === 0 || comFechamento.has(n.id))
        .map((n) => ({ id: n.id, label: n.nome })),
    })
  }, [filtros, setOpts])

  const anos = anoOpts.length ? anoOpts : [new Date().getFullYear()]
  const selectStyle = { background: t.surface, border: `1px solid ${t.border}`, color: t.text } as const
  // O popup nativo do <select> no Chrome/Windows tem fundo claro e as <option>
  // herdam o color branco do select em dark mode — texto invisível. Estilo
  // explícito nas options resolve nos dois temas.
  const optionStyle = { background: t.surface, color: t.text } as const
  const selectClass = 'rounded-lg px-2.5 py-1.5 text-xs focus:outline-none'

  return (
    <div className="relative flex flex-col h-screen" style={{ background: t.bg, color: t.text }}>
      <div className="alt-bg-canvas" aria-hidden="true" />
      <div className="relative z-10 flex flex-col flex-1 min-h-0">
        {/* Top bar */}
        <div
          className="flex items-center justify-between gap-3 px-3 md:px-5 shrink-0 flex-wrap py-1.5"
          style={{
            minHeight: 52,
            borderBottom: `1px solid ${t.border}`,
            background: t.isDark ? 'rgba(5,10,20,0.55)' : 'rgba(255,255,255,0.55)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/portal"
              className="flex items-center gap-1.5 text-[11px] shrink-0 rounded-full px-2.5 py-1"
              style={{ color: t.muted, border: `1px solid ${t.border}` }}
            >
              <ArrowLeft size={12} /> Portal
            </Link>
            <div className="min-w-0">
              <div className="text-[13px] truncate" style={{ color: t.text, fontFamily: 'var(--font-display)' }}>
                BI de Fechamento
              </div>
              <div className="text-[9px]" style={{ color: t.muted, fontFamily: 'var(--font-mono)', letterSpacing: '0.16em', textTransform: 'uppercase' }}>
                Grupo ALT · Motor de Fechamento
              </div>
            </div>
          </div>

          {/* Filtros globais — ANO · MÊS · QUINZENA/DEZENA · NAVIO · UNIDADE */}
          <div className="flex gap-2 shrink-0 flex-wrap">
            <select value={ano} onChange={(e) => setAno(Number(e.target.value))} className={selectClass} style={selectStyle} aria-label="Ano">
              {anos.map((a) => <option key={a} value={a} style={optionStyle}>{a}</option>)}
            </select>
            <select
              value={mes ?? ''}
              onChange={(e) => setMes(e.target.value ? Number(e.target.value) : null)}
              className={selectClass} style={selectStyle} aria-label="Mês"
            >
              <option value="" style={optionStyle}>Todos os meses</option>
              {MESES.map((m, i) => <option key={m} value={i + 1} style={optionStyle}>{m}</option>)}
            </select>
            <select
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value as typeof periodo)}
              className={selectClass} style={selectStyle} aria-label="Quinzena ou dezena"
            >
              {PERIODO_INTRA_MES_OPTS.map((p) => <option key={p.value} value={p.value} style={optionStyle}>{p.label}</option>)}
            </select>
            <select
              value={navioId ?? ''}
              onChange={(e) => setNavioId(e.target.value ? Number(e.target.value) : null)}
              className={`${selectClass} max-w-[150px]`} style={selectStyle} aria-label="Navio"
            >
              <option value="" style={optionStyle}>Todos os navios</option>
              {navioOpts.map((n) => <option key={n.id} value={n.id} style={optionStyle}>{n.label}</option>)}
            </select>
            <select
              value={unidadeId ?? ''}
              onChange={(e) => setUnidadeId(e.target.value ? Number(e.target.value) : null)}
              className={`${selectClass} max-w-[170px]`} style={selectStyle} aria-label="Unidade"
            >
              <option value="" style={optionStyle}>Todas as unidades</option>
              {unidadeOpts.map((u) => <option key={u.id} value={u.id} style={optionStyle}>{u.label}</option>)}
            </select>
          </div>
        </div>

        {/* Sub-bar de abas (rota) — mesmo pill nav dos outros shells */}
        <div
          className="flex items-center px-3 md:px-5 shrink-0 overflow-x-auto"
          style={{
            height: 40,
            borderBottom: `1px solid ${t.border}`,
            background: t.isDark ? 'rgba(5,10,20,0.55)' : 'rgba(255,255,255,0.55)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
        >
          <div className="flex gap-0.5 rounded-full p-0.5" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
            {TABS.map(({ href, label, Icon }) => {
              const active = pathname === href
              return (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10.5px] whitespace-nowrap transition-all"
                  style={{
                    color: active ? t.gold : t.muted,
                    background: active ? t.goldDim : 'transparent',
                    fontWeight: active ? 600 : 500,
                    letterSpacing: '0.02em',
                  }}
                >
                  <Icon size={11} strokeWidth={active ? 2 : 1.6} />
                  {label}
                </Link>
              )
            })}
          </div>
        </div>

        <main className="flex-1 overflow-auto relative z-0 p-4 md:p-6">
          <PermissionGate require="fechamento:bi" fallback={<AcessoRestrito />}>
            {children}
          </PermissionGate>
        </main>
      </div>
    </div>
  )
}
