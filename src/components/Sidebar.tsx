'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Building2, BarChart3, FileText,
  ChevronDown, ChevronRight, LogOut, PanelLeftClose,
  PanelLeft, CheckSquare, Shield,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

interface NavChild {
  label: string
  href: string
  modulo?: string
}

interface NavItem {
  label: string
  href?: string
  icon: React.ReactNode
  modulo?: string
  children?: NavChild[]
}

const navigation: NavItem[] = [
  {
    label: 'Grupo',
    icon: <Building2 size={20} />,
    modulo: 'grupo',
    children: [
      { label: 'Visão Geral', href: '/portal/grupo' },
      { label: 'Estrutura', href: '/portal/grupo/estrutura' },
      { label: 'Segmentação', href: '/portal/grupo/segmentacao' },
    ],
  },
  {
    label: 'Indicadores',
    icon: <BarChart3 size={20} />,
    modulo: 'indicadores',
    children: [
      { label: 'Dashboard', href: '/portal/indicadores' },
      { label: 'Portal BI', href: '/bi/financeiro' },
      { label: 'Financeiro', href: '/portal/indicadores/financeiro' },
      { label: 'Contábil', href: '/portal/indicadores/contabil' },
      { label: 'Faturamento', href: '/portal/indicadores/faturamento' },
      { label: 'Custos', href: '/portal/indicadores/custos' },
      { label: 'Controladoria', href: '/portal/indicadores/controladoria' },
    ],
  },
  {
    label: 'Documentação',
    icon: <FileText size={20} />,
    modulo: 'documentos',
    children: [
      { label: 'Processos', href: '/portal/documentos/processos' },
      { label: 'Políticas', href: '/portal/documentos/politicas' },
      { label: 'Planejamentos', href: '/portal/documentos/planejamentos' },
    ],
  },
  {
    label: 'Motor Fechamento',
    icon: <CheckSquare size={20} />,
    href: '/portal/fechamento',
    modulo: 'fechamento',
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { user, empresas, empresaAtiva, grupos, grupoAtivo, hasPermissao, setEmpresaAtiva, setGrupoAtivo, logout } = useAuthStore()
  const [collapsed, setCollapsed] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => {
    const active = new Set<string>()
    navigation.forEach(item => {
      if (item.children?.some(c => pathname.startsWith(c.href))) {
        active.add(item.label)
      }
    })
    return active
  })

  const toggleSection = (label: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  const visibleNav = useMemo(() => navigation.filter(item => {
    if (user?.is_admin) return true
    if (!item.modulo) return true
    return hasPermissao(item.modulo, 'visualizar')
  }), [user?.is_admin, hasPermissao])

  return (
    <aside
      className={`flex flex-col h-screen bg-[#05091A] border-r border-white/[0.07] transition-all duration-300 ${
        collapsed ? 'w-[56px]' : 'w-[240px]'
      }`}
    >
      {/* Logo + Toggle */}
      <div className="flex items-center justify-between px-3 h-14 border-b border-white/[0.07]">
        {!collapsed && (
          <span className="text-sm font-semibold text-[#F1F5F9] tracking-wider">
            GRUPO ALT
          </span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded hover:bg-white/[0.05] text-[#64748B]"
        >
          {collapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      {/* Grupo Selector */}
      {!collapsed && grupos.length > 0 && (
        <div className="px-3 py-2 border-b border-white/[0.07]">
          <select
            className="w-full bg-white/[0.034] border border-white/[0.07] rounded px-2 py-1.5 text-xs text-[#F1F5F9] focus:outline-none focus:border-[#38BDF8]"
            value={grupoAtivo?.id || ''}
            onChange={e => {
              const g = grupos.find(g => g.id === Number(e.target.value))
              if (g) setGrupoAtivo(g)
            }}
          >
            {grupos.map(g => (
              <option key={g.id} value={g.id}>{g.nome}</option>
            ))}
          </select>
        </div>
      )}

      {/* Empresa Selector */}
      {!collapsed && empresas.length > 0 && (
        <div className="px-3 py-2 border-b border-white/[0.07]">
          <select
            className="w-full bg-white/[0.034] border border-white/[0.07] rounded px-2 py-1.5 text-xs text-[#F1F5F9] focus:outline-none focus:border-[#38BDF8]"
            value={empresaAtiva?.id || ''}
            onChange={e => {
              const emp = empresas.find(emp => emp.id === Number(e.target.value))
              if (emp) setEmpresaAtiva(emp)
            }}
          >
            {empresas.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.nome}</option>
            ))}
          </select>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2">
        {visibleNav.map(item => (
          <div key={item.label}>
            {item.children ? (
              <>
                <button
                  onClick={() => toggleSection(item.label)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors ${
                    item.children.some(c => isActive(c.href))
                      ? 'text-[#38BDF8]'
                      : 'text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-white/[0.034]'
                  }`}
                >
                  {item.icon}
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      {expandedSections.has(item.label)
                        ? <ChevronDown size={14} />
                        : <ChevronRight size={14} />
                      }
                    </>
                  )}
                </button>
                {!collapsed && expandedSections.has(item.label) && (
                  <div className="ml-8 border-l border-white/[0.07]">
                    {item.children.map(child => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`block pl-3 py-1.5 text-xs transition-colors ${
                          isActive(child.href)
                            ? 'text-[#38BDF8] border-l-2 border-[#38BDF8] -ml-px'
                            : 'text-[#64748B] hover:text-[#F1F5F9]'
                        }`}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <Link
                href={item.href!}
                className={`flex items-center gap-3 px-3 py-2 text-sm transition-colors ${
                  isActive(item.href!)
                    ? 'text-[#38BDF8] bg-white/[0.034]'
                    : 'text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-white/[0.034]'
                }`}
              >
                {item.icon}
                {!collapsed && <span>{item.label}</span>}
              </Link>
            )}
          </div>
        ))}
      </nav>

      {/* Footer: Admin + Logout */}
      <div className="border-t border-white/[0.07] py-2">
        {user?.is_admin && (
          <Link
            href="/portal/admin"
            className={`flex items-center gap-3 px-3 py-2 text-sm transition-colors ${
              isActive('/portal/admin')
                ? 'text-[#38BDF8]'
                : 'text-[#64748B] hover:text-[#F1F5F9] hover:bg-white/[0.034]'
            }`}
          >
            <Shield size={20} />
            {!collapsed && <span>Admin</span>}
          </Link>
        )}
        <button
          onClick={() => { logout(); window.location.href = '/login' }}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-[#64748B] hover:text-[#F87171] hover:bg-white/[0.034] transition-colors"
        >
          <LogOut size={20} />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </aside>
  )
}
