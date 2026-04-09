'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import api from '@/lib/api'
import { useThemeStore } from '@/store/themeStore'
import { useEmpresaStore, getLogo } from '@/store/empresaStore'
import { useUnidadeStore } from '@/store/unidadeStore'
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
  const logo = getLogo(active, t.isDark)
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      // Flush API cache for this empresa
      const id = useEmpresaStore.getState().activeId
      if (id) {
        await api.post(`/empresas/${id}/cache/flush`).catch(() => {})
      }
      // Reload page
      window.location.reload()
    } catch {
      window.location.reload()
    }
  }, [])

  // Carrega projetos/unidades sempre que a empresa muda
  useEffect(() => {
    fetchProjetos(activeId)
  }, [activeId, fetchProjetos])

  return (
    <nav
      className="flex items-center justify-between px-3 md:px-5 sticky top-0 z-30 shrink-0"
      style={{
        height: 52,
        borderBottom: `1px solid ${t.border}`,
        background: t.surfaceElevated,
      }}
    >
      {/* Left: Back to Portal + Logo */}
      <div className="flex items-center gap-2 md:gap-3 shrink-0">
        <Link
          href="/portal/grupo"
          className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] no-underline transition-all"
          style={{
            color: t.muted,
            background: t.surface,
            border: `1px solid ${t.border}`,
          }}
          title="Voltar ao Portal"
        >
          <ArrowLeft size={11} />
          <span className="hidden sm:inline">Portal</span>
        </Link>
        <div className="hidden md:flex items-baseline gap-2">
          {logo ? (
            <img src={logo} alt={active?.nome || 'Logo'} style={{ height: 30 }} />
          ) : (
            <div className="flex items-baseline gap-2">
              <Building2 size={16} style={{ color: active?.cor || '#38BDF8' }} className="self-center" />
              <span className="font-mono text-[13px] tracking-widest font-bold" style={{ color: t.text }}>
                ALT MAX
              </span>
            </div>
          )}
          <span className="text-[8px] tracking-[3px] font-mono" style={{ color: t.blue }}>
            PORTAL BI
          </span>
        </div>
      </div>

      {/* Center: Tabs — scrollable on mobile */}
      <div
        className="flex gap-0.5 rounded-lg p-0.5 overflow-x-auto mx-2 md:mx-0 shrink min-w-0"
        style={{ background: `${t.text}06`, scrollbarWidth: 'none' }}
      >
        {NAV.map(({ href, label, exact }: { href: string; label: string; exact?: boolean }) => {
          const isActive = exact ? pathname === href : (pathname === href || pathname?.startsWith(href + '/'))
          return (
            <Link
              key={href}
              href={href}
              className="px-2.5 md:px-3 py-1 rounded-md text-[10px] no-underline transition-all whitespace-nowrap shrink-0"
              style={{
                color: isActive ? t.blue : t.muted,
                background: isActive ? t.blueDim : 'transparent',
                fontWeight: isActive ? 600 : 400,
              }}
            >
              {label}
            </Link>
          )
        })}
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center justify-center w-8 h-8 rounded-lg transition-all"
          style={{
            background: t.surface,
            border: `1px solid ${t.border}`,
            color: t.muted,
          }}
          title="Atualizar dados"
          aria-label="Atualizar dados"
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
        </button>
        {pathname.includes('/extrato') && (
          <ExportPDFButton
            empresaId={activeId}
            endpoint="/v1/export/empresas/{empresa_id}/extrato/pdf"
            filename="extrato.pdf"
            label="PDF Extrato"
          />
        )}
        {pathname.includes('/cp-cr') && (
          <>
            <ExportPDFButton
              empresaId={activeId}
              endpoint="/v1/export/empresas/{empresa_id}/cp/pdf"
              filename="contas-pagar.pdf"
              label="PDF CP"
            />
            <ExportPDFButton
              empresaId={activeId}
              endpoint="/v1/export/empresas/{empresa_id}/cr/pdf"
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
        <Link
          href="/bi/financeiro/admin"
          className="flex items-center justify-center w-8 h-8 rounded-lg transition-all"
          style={{
            background: t.surface,
            border: `1px solid ${t.border}`,
            color: pathname === '/bi/financeiro/admin' ? t.blue : t.muted,
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
      </div>

    </nav>
  )
}
