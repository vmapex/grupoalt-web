'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import api from '@/lib/api'
import { useThemeStore } from '@/store/themeStore'
import { useEmpresaStore, getLogo } from '@/store/empresaStore'
import { useUnidadeStore } from '@/store/unidadeStore'
import { useAuthStore } from '@/store/authStore'
import { canAccessAdmin } from '@/lib/access'
import { ThemeToggle } from './ThemeToggle'
import { EmpresaDropdown } from './EmpresaDropdown'
import { UnidadeDropdown } from './UnidadeDropdown'
import { DateRangePicker } from './DateRangePicker'
import { NotificationBell } from './NotificationBell'
import { ExportPDFButton } from '@/components/ui/ExportPDFButton'
import { Settings, Building2, ArrowLeft, RefreshCw } from 'lucide-react'

const NAV = [
  { href: '/bi/financeiro', label: 'Dashboard', exact: true },
  { href: '/bi/financeiro/caixa', label: 'Caixa Realizado' },
  { href: '/bi/financeiro/extrato', label: 'Extrato' },
  { href: '/bi/financeiro/cp-cr', label: 'A Pagar/Receber' },
  { href: '/bi/financeiro/fluxo', label: 'Fluxo de Caixa' },
  { href: '/bi/financeiro/conciliacao', label: 'Conciliação' },
]

export function Navbar() {
  const t = useThemeStore((s) => s.tokens)
  const pathname = usePathname()
  const active = useEmpresaStore((s) => s.getActive())
  const activeId = useEmpresaStore((s) => s.activeId)
  const fetchProjetos = useUnidadeStore((s) => s.fetchProjetos)
  const user = useAuthStore((s) => s.user)
  const isAdmin = canAccessAdmin(user)
  const logo = getLogo(active, t.isDark)
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = useCallback(async () => {
    if (!isAdmin) return
    setRefreshing(true)
    const id = useEmpresaStore.getState().activeId
    if (!id) {
      setRefreshing(false)
      return
    }
    try {
      await api.post(`/empresas/${id}/cache/flush`)
      window.location.reload()
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 403) {
        // Backend recusou — UI provavelmente esta desalinhada do RBAC.
        // eslint-disable-next-line no-console
        console.warn('[Navbar] cache flush negado pelo backend (403)')
        setRefreshing(false)
      } else {
        // Falha de rede/timeout: ainda assim recarrega para dar uma chance
        // de leitura fresca; cache continua no Redis.
        window.location.reload()
      }
    }
  }, [isAdmin])

  useEffect(() => {
    if (activeId) fetchProjetos(activeId)
  }, [activeId, fetchProjetos])

  // Glass effect: blurred translucent surface that adapts to mode
  const navBg = t.isDark
    ? 'rgba(5, 10, 20, 0.72)'
    : 'rgba(255, 255, 255, 0.78)'

  return (
    <nav
      className="flex items-center justify-between px-3 md:px-5 sticky top-0 z-30 shrink-0"
      style={{
        height: 56,
        borderBottom: `1px solid ${t.border}`,
        background: navBg,
        backdropFilter: 'blur(20px) saturate(140%)',
        WebkitBackdropFilter: 'blur(20px) saturate(140%)',
      }}
    >
      {/* Hairline gold under the navbar — subtle premium signature */}
      <div
        className="absolute left-0 right-0 bottom-0 h-px pointer-events-none"
        style={{
          background: `linear-gradient(90deg, transparent, ${t.borderGold}, transparent)`,
          opacity: 0.6,
        }}
      />

      {/* Left: Back to Portal + Brand */}
      <div className="flex items-center gap-2 md:gap-3 shrink-0">
        <Link
          href="/portal/grupo"
          className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] no-underline transition-all"
          style={{
            color: t.muted,
            background: t.surface,
            border: `1px solid ${t.border}`,
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.08em',
          }}
          title="Voltar ao Portal"
        >
          <ArrowLeft size={11} strokeWidth={2.2} />
          <span className="hidden sm:inline">PORTAL</span>
        </Link>

        <div className="hidden md:flex items-center gap-2.5">
          {logo ? (
            <img src={logo} alt={active?.nome || 'Logo'} style={{ height: 28 }} />
          ) : (
            <>
              {/* Brand mark — square with the "A" gold accent (design system) */}
              <div
                className="relative flex items-center justify-center rounded-md"
                style={{
                  width: 26,
                  height: 26,
                  background: 'linear-gradient(135deg, var(--alt-azul-500), var(--alt-azul-700))',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 4px 12px rgba(4,58,118,0.32)',
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 14,
                    fontWeight: 400,
                    color: t.gold,
                    textShadow: '0 0 8px rgba(224,184,46,0.45)',
                    lineHeight: 1,
                  }}
                >
                  A
                </span>
              </div>
              <span
                className="text-[13px] tracking-wide"
                style={{
                  color: t.text,
                  fontFamily: 'var(--font-display)',
                  letterSpacing: '-0.01em',
                }}
              >
                {active?.nome || 'Grupo ALT'}
              </span>
            </>
          )}
          <span
            className="text-[8.5px] tracking-[0.32em] font-mono uppercase"
            style={{ color: t.gold }}
          >
            Portal BI
          </span>
        </div>
      </div>

      {/* Center: Tabs — pill group with gold accent on active */}
      <div
        className="flex gap-0.5 rounded-full p-0.5 overflow-x-auto mx-2 md:mx-0 shrink min-w-0"
        style={{
          background: t.surface,
          border: `1px solid ${t.border}`,
          scrollbarWidth: 'none',
        }}
      >
        {NAV.map(({ href, label, exact }) => {
          const isActive = exact ? pathname === href : (pathname === href || pathname?.startsWith(href + '/'))
          return (
            <Link
              key={href}
              href={href}
              className="relative px-3 md:px-3.5 py-1.5 rounded-full text-[11px] no-underline transition-all whitespace-nowrap shrink-0"
              style={{
                color: isActive ? (t.isDark ? '#0A1426' : '#FFFFFF') : t.muted,
                background: isActive
                  ? (t.isDark
                      ? 'linear-gradient(135deg, var(--alt-ouro-300), var(--alt-ouro-500))'
                      : 'linear-gradient(135deg, var(--alt-azul-400), var(--alt-azul-600))')
                  : 'transparent',
                fontWeight: isActive ? 600 : 500,
                letterSpacing: '0.01em',
                boxShadow: isActive
                  ? (t.isDark
                      ? '0 4px 14px rgba(204,160,0,0.35), inset 0 1px 0 rgba(255,255,255,0.25)'
                      : '0 4px 14px rgba(4,81,153,0.28), inset 0 1px 0 rgba(255,255,255,0.18)')
                  : 'none',
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.color = t.text
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.color = t.muted
              }}
            >
              {label}
            </Link>
          )
        })}
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
        {isAdmin && (
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center justify-center w-8 h-8 rounded-lg transition-all"
            style={{
              background: t.surface,
              border: `1px solid ${t.border}`,
              color: t.muted,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = t.borderGold
              e.currentTarget.style.color = t.gold
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = t.border
              e.currentTarget.style.color = t.muted
            }}
            title="Atualizar dados (cache flush)"
            aria-label="Atualizar dados (cache flush)"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          </button>
        )}
        {isAdmin && pathname.includes('/extrato') && (
          <ExportPDFButton
            empresaId={activeId}
            report="extrato"
            filename="extrato.pdf"
            label="PDF Extrato"
          />
        )}
        {isAdmin && pathname.includes('/cp-cr') && (
          <>
            <ExportPDFButton
              empresaId={activeId}
              report="cp"
              filename="contas-pagar.pdf"
              label="PDF CP"
            />
            <ExportPDFButton
              empresaId={activeId}
              report="cr"
              filename="contas-receber.pdf"
              label="PDF CR"
            />
          </>
        )}
        <div className="hidden md:flex items-center gap-2">
          <DateRangePicker />
          <UnidadeDropdown />
        </div>
        <NotificationBell />
        <ThemeToggle />
        <div className="hidden sm:block">
          <EmpresaDropdown />
        </div>
        {isAdmin && (
          <Link
            href="/bi/financeiro/admin"
            className="flex items-center justify-center w-8 h-8 rounded-lg transition-all"
            style={{
              background: t.surface,
              border: `1px solid ${pathname === '/bi/financeiro/admin' ? t.borderGold : t.border}`,
              color: pathname === '/bi/financeiro/admin' ? t.gold : t.muted,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = t.borderGold
              e.currentTarget.style.color = t.gold
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = pathname === '/bi/financeiro/admin' ? t.borderGold : t.border
              e.currentTarget.style.color = pathname === '/bi/financeiro/admin' ? t.gold : t.muted
            }}
            aria-label="Configurações"
          >
            <Settings
              size={13}
              className="transition-transform"
              style={{
                transform: pathname === '/bi/financeiro/admin' ? 'rotate(90deg)' : 'none',
              }}
            />
          </Link>
        )}
      </div>
    </nav>
  )
}
