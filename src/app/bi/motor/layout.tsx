'use client'
/* ═══════════════════════════════════════════════════════════════
   Fase D — shell dedicado do BI do Motor (/bi/motor), espelho do
   shell do BI financeiro: auth guard + aurora + barra própria com
   filtros globais (ano/unidade) e sub-bar de abas por rota:

     Visão Executiva  · /bi/motor
     Custo × Fat      · /bi/motor/custos
     Devedores        · /bi/motor/devedores   (estrutura — D2)
     Fechamento       · /bi/motor/fechamento  (estrutura — D3)

   Gate fechamento:bi na casca inteira (PermissionGate; o gate real
   é o has_permission do proxy /motor/bi/*).
   ═══════════════════════════════════════════════════════════════ */
import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { BarChart3, TrendingDown, HandCoins, ClipboardCheck, ArrowLeft } from 'lucide-react'
import { useThemeStore } from '@/store/themeStore'
import { useEmpresaStore } from '@/store/empresaStore'
import { useAuthStore } from '@/store/authStore'
import { useBiMotorStore } from '@/store/biMotorStore'
import { useFetchPermissoesAtivas } from '@/hooks/usePermission'
import { PermissionGate } from '@/components/auth/PermissionGate'
import api from '@/lib/api'

const ANO_MIN = 2024 // início do histórico das planilhas importadas

const TABS = [
  { href: '/bi/motor', label: 'Visão Executiva', Icon: BarChart3 },
  { href: '/bi/motor/custos', label: 'Custo × Faturamento', Icon: TrendingDown },
  { href: '/bi/motor/devedores', label: 'Devedores', Icon: HandCoins },
  { href: '/bi/motor/fechamento', label: 'Fechamento', Icon: ClipboardCheck },
]

function AcessoRestrito() {
  const t = useThemeStore((s) => s.tokens)
  return (
    <div className="max-w-lg mx-auto mt-16 rounded-xl p-8 text-center" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
      <div className="text-sm" style={{ color: t.textSec }}>
        Acesso restrito — o BI do Motor exige a permissão <span style={{ color: t.gold }}>fechamento:bi</span>.
      </div>
      <div className="text-xs mt-2" style={{ color: t.muted }}>
        Solicite ao administrador no cadastro de perfis do portal.
      </div>
    </div>
  )
}

export default function BIMotorLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { mode, tokens: t } = useThemeStore()
  const syncFromAuth = useEmpresaStore((s) => s.syncFromAuth)
  const synced = useEmpresaStore((s) => s._synced)
  const setAuth = useAuthStore((s) => s.setAuth)
  const user = useAuthStore((s) => s.user)
  const ano = useBiMotorStore((s) => s.ano)
  const setAno = useBiMotorStore((s) => s.setAno)
  const unidadeId = useBiMotorStore((s) => s.unidadeId)
  const setUnidadeId = useBiMotorStore((s) => s.setUnidadeId)
  const unidadeOpts = useBiMotorStore((s) => s.unidadeOpts)

  useFetchPermissoesAtivas()

  // Auth guard — mesmo padrão do shell do BI financeiro.
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

  const anoAtual = new Date().getFullYear()
  const anos: number[] = []
  for (let a = anoAtual; a >= ANO_MIN; a--) anos.push(a)

  const selectStyle = { background: t.surface, border: `1px solid ${t.border}`, color: t.text } as const
  // Popup nativo do <select> no Chrome/Windows é claro e as <option> herdam o
  // color branco do select em dark mode — texto invisível sem estilo explícito.
  const optionStyle = { background: t.surface, color: t.text } as const

  return (
    <div className="relative flex flex-col h-screen" style={{ background: t.bg, color: t.text }}>
      <div className="alt-bg-canvas" aria-hidden="true" />
      <div className="relative z-10 flex flex-col flex-1 min-h-0">
        {/* Top bar */}
        <div
          className="flex items-center justify-between gap-3 px-3 md:px-5 shrink-0"
          style={{
            height: 52,
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
                BI do Motor de Fechamento
              </div>
              <div className="text-[9px]" style={{ color: t.muted, fontFamily: 'var(--font-mono)', letterSpacing: '0.16em', textTransform: 'uppercase' }}>
                Grupo ALT · dados ao vivo
              </div>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <select
              value={ano}
              onChange={(e) => setAno(Number(e.target.value))}
              className="rounded-lg px-3 py-1.5 text-xs focus:outline-none"
              style={selectStyle}
              aria-label="Ano"
            >
              {anos.map((a) => <option key={a} value={a} style={optionStyle}>{a}</option>)}
            </select>
            <select
              value={unidadeId ?? ''}
              onChange={(e) => setUnidadeId(e.target.value ? Number(e.target.value) : null)}
              className="rounded-lg px-3 py-1.5 text-xs focus:outline-none max-w-[180px]"
              style={selectStyle}
              aria-label="Unidade"
            >
              <option value="" style={optionStyle}>Todas as unidades</option>
              {unidadeOpts.map((u) => <option key={u.id} value={u.id} style={optionStyle}>{u.label}</option>)}
            </select>
          </div>
        </div>

        {/* Sub-bar de abas (rota) — espelho do pill nav do financeiro */}
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
