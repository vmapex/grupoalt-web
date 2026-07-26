'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3, FileText,
  ChevronDown, Search, LayoutDashboard,
  Landmark, TrendingUp, GitCompare, Network, Layers,
  Settings,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore } from '@/store/themeStore'
import { canAccessAdmin } from '@/lib/access'
import { usePermissoesAtivas } from '@/hooks/usePermission'
import { hasPermissionIn } from '@/store/permissoesStore'
import { EmpresaSelector } from '@/components/nav/EmpresaSelector'

interface NavChild {
  label: string
  href: string
  icon?: React.ReactNode
  badge?: string
  /** Gate POR ITEM "modulo:acao" — além do `modulo` da seção. Itens que
   *  expõem visão financeira (BI, Controladoria) exigem financeiro:ver
   *  mesmo dentro da seção Indicadores (decisão do usuário 2026-07-15:
   *  perfil operacional não pode nem ver o caminho pro financeiro). */
  require?: `${string}:${string}`
}
interface NavSection {
  id: string
  label: string
  modulo?: string
  addBtn?: boolean
  children: NavChild[]
}

/** Filtra seções e itens pelo RBAC do usuário. Exportada pra teste.
 *
 *  Regras:
 *  - admin: vê tudo.
 *  - seção com `modulo`: precisa de `modulo:ver`.
 *  - item com `require`: precisa da permissão do item (além da seção).
 *  - seção que ficar sem itens visíveis some inteira.
 */
export function filterNavSections(
  all: NavSection[],
  isAdmin: boolean,
  hasPermissao: (modulo: string, acao: string) => boolean,
): NavSection[] {
  if (isAdmin) return all
  return all
    .filter((s) => !s.modulo || hasPermissao(s.modulo, 'ver'))
    .map((s) => ({
      ...s,
      children: s.children.filter((c) => {
        if (!c.require) return true
        const idx = c.require.indexOf(':')
        return hasPermissao(c.require.slice(0, idx), c.require.slice(idx + 1))
      }),
    }))
    .filter((s) => s.children.length > 0)
}

/** Catálogo de navegação. Exportado pra teste do filtro RBAC. */
export const NAV_SECTIONS: NavSection[] = [
  {
    id: 'principal',
    label: 'Principal',
    children: [
      { label: 'Início', href: '/portal', icon: <LayoutDashboard className="w-[18px] h-[18px]" /> },
    ],
  },
  {
    id: 'indicadores',
    label: 'Indicadores',
    modulo: 'indicadores',
    children: [
      { label: 'Financeiro', href: '/bi/financeiro', icon: <BarChart3 className="w-[18px] h-[18px]" />, require: 'financeiro:ver' },
      { label: 'Operações', href: '/portal/indicadores/operacoes', icon: <TrendingUp className="w-[18px] h-[18px]" /> },
      { label: 'Controladoria', href: '/portal/indicadores/controladoria', icon: <Landmark className="w-[18px] h-[18px]" />, require: 'financeiro:ver' },
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
    modulo: 'fechamento',
    children: [
      { label: 'Motor Fechamento v2.0', href: '/portal/fechamento', icon: <GitCompare className="w-[18px] h-[18px]" /> },
      // Fase D: visão gerencial do GRUPO — exige fechamento:bi (não :ver,
      // que é o gate do SSO que operadores têm). Shell dedicado /bi/motor,
      // espelho do BI financeiro (validação 2026-07-22).
      { label: 'BI do Motor', href: '/bi/motor', icon: <BarChart3 className="w-[18px] h-[18px]" />, require: 'fechamento:bi' },
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
  const user = useAuthStore((s) => s.user)
  const t = useThemeStore((s) => s.tokens)
  // F2 da unificação (2026-07-17): o gate lê as permissões RBAC EFETIVAS
  // da empresa ativa (GET /auth/me/permissoes/{id}, cacheadas pelo
  // permissoesStore — fetch disparado no layout do portal). Antes lia as
  // permissões LEGADAS do /auth/me (vocabulário 'visualizar' incompatível):
  // não-admin com financeiro:ver no RBAC não via "Financeiro" no menu.
  // Fail-closed: enquanto o fetch não chega, não-admin vê só as seções
  // sem gate (perms === undefined ⇒ hasPermissionIn === false).
  const perms = usePermissoesAtivas()

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const [hoveredAdmin, setHoveredAdmin] = useState(false)

  const toggleSection = (id: string) => {
    setCollapsed(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  const isAdmin = canAccessAdmin(user)

  // Nota histórica: a ação aqui já foi 'visualizar' (fora do vocabulário
  // RBAC — 'ver' em app/core/rbac.py ACOES) e toda seção sumia pra
  // não-admin; corrigido no #191. O filtro por item entrou em 2026-07-15.
  const visibleSections = useMemo(
    () => filterNavSections(NAV_SECTIONS, isAdmin, (m, a) => hasPermissionIn(perms, m, a)),
    [isAdmin, perms],
  )

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
        <EmpresaSelector />

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
