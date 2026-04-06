'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Building2, BarChart3, FileText, CalendarCheck,
  ChevronDown, Search, LayoutDashboard,
  Landmark, TrendingUp, GitCompare, Network, Layers,
  Settings,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

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
      { label: 'Processos', href: '/portal/documentos/processos', icon: <FileText className="w-[18px] h-[18px]" /> },
      { label: 'Políticas', href: '/portal/documentos/politicas', icon: <FileText className="w-[18px] h-[18px]" /> },
      { label: 'Organograma', href: '/portal/documentos/organograma', icon: <Network className="w-[18px] h-[18px]" /> },
      { label: 'Missão | Visão | Valores', href: '/portal/documentos/mvv', icon: <Layers className="w-[18px] h-[18px]" /> },
      { label: 'Planejamento', href: '/portal/documentos/planejamentos', icon: <CalendarCheck className="w-[18px] h-[18px]" /> },
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

export default function Sidebar() {
  const pathname = usePathname()
  const { user, empresas, empresaAtiva, grupos, grupoAtivo, hasPermissao, setEmpresaAtiva, setGrupoAtivo, logout } = useAuthStore()

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const toggleSection = (id: string) => {
    setCollapsed(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  const visibleSections = useMemo(() => sections.filter(s => {
    if (user?.is_admin) return true
    if (!s.modulo) return true
    return hasPermissao(s.modulo, 'visualizar')
  }), [user?.is_admin, hasPermissao])

  const userInitials = user?.nome
    ? user.nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  return (
    <aside className="hidden md:flex w-[280px] flex-col border-r relative overflow-hidden flex-shrink-0" style={{ background: 'var(--surface-elevated)', borderColor: 'var(--border)' }}>
      {/* Gold accent top line */}
      <div className="h-[2px] flex-shrink-0" style={{
        background: 'linear-gradient(90deg, #CCA000 0%, #E0B82E 25%, #F5E6A3 50%, #E0B82E 75%, #CCA000 100%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 4s ease-in-out infinite',
      }} />

      {/* Account Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 p-5">
        <button className="flex gap-2 hover:bg-zinc-800 transition-all text-sm font-medium bg-zinc-800 border-zinc-700 border rounded-xl py-2.5 px-4 items-center shadow-sm">
          <Building2 className="w-4 h-4 text-[#CCA000]" />
          <span className="text-zinc-100">{grupoAtivo?.nome || 'Grupo ALT'}</span>
          <ChevronDown className="w-4 h-4 text-zinc-500" />
        </button>
        <div className="relative">
          <div className="w-10 h-10 bg-gradient-to-br from-[#CCA000] to-[#E0B82E] border-2 border-zinc-800 rounded-xl flex items-center justify-center text-zinc-900 text-xs font-bold shadow-sm">
            {userInitials}
          </div>
          <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-zinc-900" />
        </div>
      </div>

      {/* Search */}
      <div className="px-4 pt-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar..."
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 pl-9 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#CCA000] focus:ring-1 focus:ring-[#CCA000] transition-colors"
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
              <span className="text-zinc-500 uppercase text-xs tracking-wider font-medium flex items-center gap-2">
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${collapsed[section.id] ? '-rotate-90' : ''}`} />
                {section.label}
              </span>
            </button>
            {!collapsed[section.id] && (
              <div className="transition-all duration-200">
                {section.children.map((child) => {
                  const active = isActive(child.href)
                  return (
                    <Link
                      key={child.href}
                      href={child.href}
                      className={`flex items-center gap-3 px-4 py-3 mx-2 rounded-xl transition-colors mb-0.5 ${
                        active
                          ? 'bg-gradient-to-r from-zinc-700 to-zinc-800 text-zinc-100 shadow-sm'
                          : 'text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100'
                      }`}
                    >
                      {child.icon}
                      <span className={active ? 'font-medium' : ''}>{child.label}</span>
                      {child.badge && (
                        <span className="ml-auto bg-[#CCA000]/20 text-[#E0B82E] text-xs px-2 py-0.5 rounded-full font-medium">
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
            <span className="text-zinc-500 uppercase text-xs tracking-wider font-medium flex items-center gap-2">
              <ChevronDown className="w-3.5 h-3.5" />
              Empresas
            </span>
          </button>
          {empresas.map((emp, i) => (
            <button
              key={emp.id}
              onClick={() => setEmpresaAtiva(emp)}
              className={`flex items-center gap-3 w-full px-4 py-2.5 mx-2 rounded-xl transition-colors ${
                empresaAtiva?.id === emp.id ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${
                i === 0 ? 'bg-[#CCA000]' : i === 1 ? 'bg-blue-500' : 'bg-emerald-500'
              }`} />
              <span className="text-sm">{emp.nome}</span>
              {empresaAtiva?.id === emp.id && (
                <span className="ml-auto text-xs text-zinc-500">Principal</span>
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Settings / Admin */}
      <div className="border-t border-zinc-800 px-2 py-3">
        {user?.is_admin && (
          <Link
            href="/portal/admin"
            className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-xl transition-colors text-sm ${
              isActive('/portal/admin') ? 'text-zinc-100 bg-zinc-800' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
            }`}
          >
            <Settings className="w-[18px] h-[18px]" />
            <span>Administração</span>
          </Link>
        )}
      </div>

      {/* Gold bottom line */}
      <div className="h-[2px] flex-shrink-0" style={{
        background: 'linear-gradient(90deg, #CCA000 0%, #E0B82E 25%, #F5E6A3 50%, #E0B82E 75%, #CCA000 100%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 4s ease-in-out infinite',
      }} />

      <style jsx>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </aside>
  )
}
