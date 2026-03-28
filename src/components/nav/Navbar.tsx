'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useThemeStore } from '@/store/themeStore'
import { useEmpresaStore, getLogo } from '@/store/empresaStore'
import { useUnidadeStore } from '@/store/unidadeStore'
import { ThemeToggle } from './ThemeToggle'
import { EmpresaDropdown } from './EmpresaDropdown'
import { UnidadeDropdown } from './UnidadeDropdown'
import { DateRangePicker } from './DateRangePicker'
import { NotificationBell } from './NotificationBell'
import { ExportButton } from '@/components/export/ExportButton'
import { ExportModal } from '@/components/export/ExportModal'
import { Settings, Building2 } from 'lucide-react'

const NAV = [
  { href: '/bi/financeiro', label: 'Home', exact: true },
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
  const [exportOpen, setExportOpen] = useState(false)

  // Carrega projetos/unidades sempre que a empresa muda
  useEffect(() => {
    fetchProjetos(activeId)
  }, [activeId, fetchProjetos])

  return (
    <nav
      className="flex items-center justify-between px-5 sticky top-0 z-30 shrink-0"
      style={{
        height: 52,
        borderBottom: `1px solid ${t.border}`,
        background: t.surfaceElevated,
      }}
    >
      {/* Left: Logo */}
      <div className="flex items-baseline gap-2">
        {logo ? (
          <img src={logo} alt={active.nome} style={{ height: 30 }} />
        ) : (
          <div className="flex items-baseline gap-2">
            <Building2 size={16} style={{ color: active.cor }} className="self-center" />
            <span className="font-mono text-[13px] text-white tracking-widest font-bold">
              ALT MAX
            </span>
          </div>
        )}
        <span className="text-[8px] tracking-[3px] font-mono" style={{ color: t.blue }}>
          PORTAL BI
        </span>
      </div>

      {/* Center: Tabs */}
      <div
        className="flex gap-0.5 rounded-lg p-0.5"
        style={{ background: `${t.text}06` }}
      >
        {NAV.map(({ href, label, exact }: { href: string; label: string; exact?: boolean }) => {
          const isActive = exact ? pathname === href : (pathname === href || pathname?.startsWith(href + '/'))
          return (
            <Link
              key={href}
              href={href}
              className="px-3 py-1 rounded-md text-[10px] no-underline transition-all"
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
      <div className="flex items-center gap-2">
        <ExportButton onClick={() => setExportOpen(true)} />
        <DateRangePicker />
        <NotificationBell />
        <UnidadeDropdown />
        <ThemeToggle />
        <EmpresaDropdown />
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

      <ExportModal open={exportOpen} onClose={() => setExportOpen(false)} />
    </nav>
  )
}
