'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Building2, BarChart3, FileText,
  ChevronDown, Search, LayoutDashboard,
  Landmark, TrendingUp, GitCompare, Network, Layers,
  Settings,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useEmpresaStore } from '@/store/empresaStore'
import { useThemeStore } from '@/store/themeStore'
import { canAccessAdmin } from '@/lib/access'

interface NavChild { label: string; href: string; icon?: React.ReactNode; badge?: string }
interface NavSection {
  id: string
  label: string
  modulo?: string
  addBtn?: boolean
  children: NavChild[]
}

const sections: NavSection[] = [
  {
    id: 'principal',
    label: 'Principal',
    children: [
      { label: 'Dashboard', href: '/portal/grupo', icon: <LayoutDashboard className="w-[18px] h-[18px]" /> },
    ],
  },
  {
    id: 'indicadores',
    label: 'Indicadores',
    modulo: 'indicadores',
    children: [
      { label: 'Financeiro', href: '/bi/financeiro', icon: <BarChart3 className="w-[18px] h-[18px]" /> },
      { label: 'Operações', href: '/portal/indicadores/operacoes', icon: <TrendingUp className="w-[18px] h-[18px]" /> },
      { label: 'Controladoria', href: '/portal/indicadores/controladoria', icon: <Landmark className="w-[18px] h-[18px]" /> },
    ],
  },
  {
    id: 'documentos',
    label: 'Documentos',
    modulo: 'documentos',
    children: [
      { label: 'Documentos', href: '/portal/documentos', icon: <FileText className="w-[18px] h-[18px]" /> },
    ],
  },
  {
    id: 'motor',
    label: 'Motor Fechamento v2.0',
    children: [
      { label: 'Motor Fechamento v2.0', href: '/portal/fechamento', icon: <GitCompare className="w-[18px] h-[18px]" /> },
    ],
  },
  {
    id: 'grupo',
    label: 'Grupo',
    modulo: 'grupo',
    children: [
      { label: 'Estrutura', href: '/portal/grupo/estrutura', icon: <Network className="w-[18px] h-[18px]" /> },
      { label: 'Segmentação', href: '/portal/grupo/segmentacao', icon: <Layers className="w-[18px] h-[18px]" /> },
    ],
  },
]

export default function Sidebar({ mobileOpen, onClose }: { mobileOpen?: boolean; onClose?: () => void }) {
  const pathname = usePathname()
  const { user, empresas, grupoAtivo, hasPermissao } = useAuthStore()
  // STEP 11 — empresa ativa vem do empresaStore (fonte de verdade compartilhada com BI).
  const activeEmpresaId = useEmpresaStore((s) => s.activeId)
  const setActiveEmpresa = useEmpresaStore((s) => s.setActive)
  const t = useThemeStore((s) => s.tokens)

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const [hoveredEmpresa, setHoveredEmpresa] = useState<number | string | null>(null)
  const [hoveredAdmin, setHoveredAdmin] = useState(false)
  const [hoveredGroupBtn, setHoveredGroupBtn] = useState(false)

  const toggleSection = (id: string) => {
    setCollapsed(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  const isAdmin = canAccessAdmin(user)

  const visibleSections = useMemo(() => sections.filter(s => {
    if (isAdmin) return true
    if (!s.modulo) return true
    return hasPermissao(s.modulo, 'visualizar')
  }), [isAdmin, hasPermissao])

  const userInitials = user?.nome
    ? user.nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  // Subtle, animated gold hairline used at top + bottom of the rail
  const goldHairline = `linear-gradient(90deg, transparent 0%, ${t.gold} 25%, ${t.goldSoft} 50%, ${t.gold} 75%, transparent 100%)`

  const sidebarContent = (
    <aside
      className={`${mobileOpen ? 'flex' : 'hidden md:flex'} w-[280px] flex-col relative overflow-hidden flex-shrink-0`}
      style={{
        background: t.surfaceElevated,
        borderRight: `1px solid ${t.border}`,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      {/* Top gold hairline — design system signature */}
      <div className="h-[1.5px] flex-shrink-0" style={{
        background: goldHairline,
        backgroundSize: '200% 100%',
        animation: 'shimmer 5s ease-in-out infinite',
        opacity: 0.7,
      }} />

      {/* Account / brand header */}
      <div
        className="flex items-center justify-between p-5"
        style={{ borderBottom: `1px solid ${t.border}` }}
      >
        <button
          className="flex gap-2 transition-all text-[13px] font-medium border rounded-xl py-2 px-3 items-center"
          style={{
            background: hoveredGroupBtn ? t.surfaceHover : t.surface,
            borderColor: hoveredGroupBtn ? t.borderGold : t.border,
            color: t.text,
            fontFamily: 'var(--font-body)',
          }}
          onMouseEnter={() => setHoveredGroupBtn(true)}
          onMouseLeave={() => setHoveredGroupBtn(false)}
        >
          <Building2 className="w-4 h-4" style={{ color: t.gold }} />
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 400, letterSpacing: '-0.01em' }}>
            {grupoAtivo?.nome || 'Grupo ALT'}
          </span>
          <ChevronDown className="w-3.5 h-3.5" style={{ color: t.muted }} />
        </button>

        {/* User avatar — gold gradient with online dot */}
        <div className="relative">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold"
            style={{
              background: `linear-gradient(135deg, ${t.gold}, ${t.goldSoft})`,
              color: '#1A1718',
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.04em',
              boxShadow: `inset 0 1px 0 rgba(255,255,255,0.3), 0 4px 12px ${t.goldDim}`,
              border: `1px solid ${t.borderGold}`,
            }}
          >
            {userInitials}
          </div>
          <div
            className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full"
            style={{ background: t.green, border: `2px solid ${t.bg}` }}
          />
        </div>
      </div>

      {/* Search */}
      <div className="px-4 pt-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: t.muted }} />
          <input
            type="text"
            placeholder="Buscar..."
            className="w-full rounded-xl px-4 py-2 pl-9 text-sm focus:outline-none transition-all"
            style={{
              background: t.surface,
              border: `1px solid ${t.border}`,
              color: t.text,
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = t.gold
              e.currentTarget.style.boxShadow = `0 0 0 3px ${t.goldDim}`
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = t.border
              e.currentTarget.style.boxShadow = 'none'
            }}
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto select-none text-sm pt-4 px-2" style={{ scrollbarWidth: 'none' }}>
        {visibleSections.map((section) => (
          <div key={section.id}>
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full px-4 mb-2 mt-5 first:mt-0 cursor-pointer hover:opacity-80 transition-opacity"
            >
              <span
                className="text-[10px] tracking-[0.22em] flex items-center gap-2"
                style={{
                  color: t.gold,
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 500,
                  textTransform: 'uppercase',
                }}
              >
                <ChevronDown
                  className={`w-3 h-3 transition-transform duration-200 ${collapsed[section.id] ? '-rotate-90' : ''}`}
                />
                {section.label}
              </span>
            </button>
            {!collapsed[section.id] && (
              <div className="transition-all duration-200">
                {section.children.map((child) => {
                  const active = isActive(child.href)
                  const hovered = hoveredItem === child.href
                  return (
                    <Link
                      key={child.href}
                      href={child.href}
                      className="relative flex items-center gap-3 px-4 py-2.5 mx-2 rounded-xl transition-all mb-0.5"
                      style={{
                        background: active
                          ? `linear-gradient(135deg, ${t.goldDim}, transparent)`
                          : hovered ? t.surfaceHover : 'transparent',
                        color: active ? t.gold : hovered ? t.text : t.textSec,
                        fontWeight: active ? 600 : 500,
                        border: `1px solid ${active ? t.borderGold : 'transparent'}`,
                      }}
                      onMouseEnter={() => setHoveredItem(child.href)}
                      onMouseLeave={() => setHoveredItem(null)}
                    >
                      {/* Active indicator: thin gold bar on the left */}
                      {active && (
                        <span
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r"
                          style={{ background: t.gold, boxShadow: t.goldGlow }}
                        />
                      )}
                      {child.icon}
                      <span>{child.label}</span>
                      {child.badge && (
                        <span
                          className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-medium"
                          style={{
                            background: t.goldDim,
                            color: t.gold,
                            border: `1px solid ${t.borderGold}`,
                            fontFamily: 'var(--font-mono)',
                          }}
                        >
                          {child.badge}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        ))}

        {/* Empresas section */}
        <div>
          <button className="w-full px-4 mb-2 mt-5 cursor-pointer hover:opacity-80 transition-opacity">
            <span
              className="text-[10px] tracking-[0.22em] flex items-center gap-2"
              style={{
                color: t.gold,
                fontFamily: 'var(--font-mono)',
                fontWeight: 500,
                textTransform: 'uppercase',
              }}
            >
              <ChevronDown className="w-3 h-3" />
              Empresas
            </span>
          </button>
          {empresas.map((emp, i) => {
            const empActive = activeEmpresaId === String(emp.id)
            const empHovered = hoveredEmpresa === emp.id
            const dotColors = [t.gold, t.blue, t.green]
            return (
              <button
                key={emp.id}
                onClick={() => setActiveEmpresa(String(emp.id))}
                className="flex items-center gap-3 w-full px-4 py-2 mx-2 rounded-xl transition-all"
                style={{
                  background: empActive ? t.surfaceHover : empHovered ? t.surface : 'transparent',
                  color: empActive || empHovered ? t.text : t.textSec,
                  border: `1px solid ${empActive ? t.border : 'transparent'}`,
                }}
                onMouseEnter={() => setHoveredEmpresa(emp.id)}
                onMouseLeave={() => setHoveredEmpresa(null)}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{
                    background: dotColors[i % dotColors.length],
                    boxShadow: `0 0 8px ${dotColors[i % dotColors.length]}`,
                  }}
                />
                <span className="text-[13px]">{emp.nome}</span>
                {empActive && (
                  <span
                    className="ml-auto text-[9px]"
                    style={{
                      color: t.gold,
                      fontFamily: 'var(--font-mono)',
                      letterSpacing: '0.18em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Ativa
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </nav>

      {/* Settings / Admin */}
      <div className="px-2 py-3" style={{ borderTop: `1px solid ${t.border}` }}>
        {isAdmin && (
          <Link
            href="/portal/admin"
            className="flex items-center gap-3 px-4 py-2.5 mx-2 rounded-xl transition-all text-sm"
            style={{
              color: isActive('/portal/admin') || hoveredAdmin ? t.text : t.muted,
              background: isActive('/portal/admin') ? t.surfaceHover : hoveredAdmin ? t.surface : 'transparent',
            }}
            onMouseEnter={() => setHoveredAdmin(true)}
            onMouseLeave={() => setHoveredAdmin(false)}
          >
            <Settings className="w-[18px] h-[18px]" />
            <span>Administração</span>
          </Link>
        )}
      </div>

      {/* Bottom gold hairline */}
      <div className="h-[1.5px] flex-shrink-0" style={{
        background: goldHairline,
        backgroundSize: '200% 100%',
        animation: 'shimmer 5s ease-in-out infinite',
        opacity: 0.5,
      }} />
    </aside>
  )

  // Mobile overlay
  if (mobileOpen) {
    return (
      <>
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{ background: 'rgba(5,10,20,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={onClose}
        />
        <div className="fixed inset-y-0 left-0 z-50 md:hidden">
          {sidebarContent}
        </div>
      </>
    )
  }

  return sidebarContent
}
