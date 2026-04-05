'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { useEmpresaStore } from '@/store/empresaStore'
import Sidebar from '@/components/Sidebar'
import { HelpCircle, ChevronRight, ChevronDown, Sun, Moon } from 'lucide-react'
import { useThemeStore } from '@/store/themeStore'
import { NotificationBell } from '@/components/nav/NotificationBell'
import api from '@/lib/api'

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, setAuth } = useAuthStore()
  const syncFromAuth = useEmpresaStore((s) => s.syncFromAuth)
  const empresaSynced = useEmpresaStore((s) => s._synced)
  const [loading, setLoading] = useState(true)
  const [notifCount, setNotifCount] = useState(0)
  const themeMode = useThemeStore((s) => s.mode)
  const toggleTheme = useThemeStore((s) => s.toggle)

  // Sync dark class on <html> for CSS variables
  useEffect(() => {
    const root = document.documentElement
    if (themeMode === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [themeMode])

  useEffect(() => {
    Promise.all([
      api.get('/auth/me'),
      api.get('/notificacoes/contagem').catch(() => ({ data: { nao_lidas: 0 } })),
    ])
      .then(([meRes, notifRes]) => {
        const data = meRes.data
        if (!data || !data.id) throw new Error('Resposta inválida do /auth/me')
        setAuth(
          { id: data.id, nome: data.nome, email: data.email, is_admin: data.is_admin },
          data.empresas || [],
          data.grupos || [],
          data.permissoes || [],
        )
        setNotifCount(notifRes.data.nao_lidas || 0)
        // Sync empresaStore with real empresas from API
        setTimeout(() => syncFromAuth(), 0)

        // Redirect admin without empresas to setup wizard
        if (data.is_admin && (!data.empresas || data.empresas.length === 0)) {
          const path = window.location.pathname
          if (!path.startsWith('/portal/setup') && !path.startsWith('/portal/admin')) {
            router.push('/portal/setup')
          }
        }

        setLoading(false)
      })
      .catch((err) => {
        console.error('Portal auth failed:', err?.response?.status, err?.message)
        if (err?.response?.status === 401 || !err?.response) {
          router.push('/login')
        } else {
          setLoading(false)
        }
      })
  }, [])

  // Breadcrumb from pathname
  const breadcrumb = (() => {
    const parts = pathname.replace('/portal', '').split('/').filter(Boolean)
    const labels: Record<string, string> = {
      grupo: 'Grupo', estrutura: 'Estrutura', segmentacao: 'Segmentação',
      financeiro: 'Financeiro', caixa: 'Caixa', extrato: 'Extrato',
      cp: 'Contas a Pagar', cr: 'Contas a Receber', fluxo: 'Fluxo de Caixa',
      conciliacao: 'Conciliação', indicadores: 'Indicadores', documentos: 'Documentos',
      fechamento: 'Motor Fechamento', admin: 'Admin', permissoes: 'Permissões',
      processos: 'Processos', politicas: 'Políticas', planejamentos: 'Planejamento',
      faturamento: 'Faturamento', custos: 'Custos', contabil: 'Contábil',
      controladoria: 'Controladoria', operacoes: 'Operações',
      organograma: 'Organograma', mvv: 'Missão | Visão | Valores',
      setup: 'Setup Inicial',
    }
    return parts.map(p => labels[p] || p)
  })()

  const userInitials = user?.nome
    ? user.nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-950">
        <div className="text-zinc-500 text-sm">Carregando portal...</div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)', color: 'var(--text)', fontFamily: "'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif" }}>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-14 flex items-center justify-between px-6 backdrop-blur-sm flex-shrink-0" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-elevated)' }}>
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-zinc-500">Portal</span>
            {breadcrumb.map((part, i) => (
              <span key={i} className="flex items-center gap-2">
                <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
                <span className={i === breadcrumb.length - 1 ? 'text-zinc-100 font-medium' : 'text-zinc-500'}>
                  {part}
                </span>
              </span>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {/* Notification Bell — full dropdown panel */}
            <NotificationBell />
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-all"
              aria-label="Alternar tema"
              title={themeMode === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
            >
              {themeMode === 'dark' ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
            </button>
            {/* Help */}
            <button className="p-2 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-all">
              <HelpCircle className="w-[18px] h-[18px]" />
            </button>

            <div className="w-px h-6 bg-zinc-800" />

            {/* User */}
            <button className="flex items-center gap-2.5 py-1.5 px-2 rounded-xl hover:bg-zinc-800 transition-all">
              <div className="w-8 h-8 bg-gradient-to-br from-[#CCA000] to-[#E0B82E] rounded-xl flex items-center justify-center text-zinc-900 text-xs font-bold shadow-sm">
                {userInitials}
              </div>
              <div className="text-left">
                <div className="text-sm font-medium text-zinc-200 leading-tight">{user?.nome?.split(' ').slice(0, 2).join(' ')}</div>
                <div className="text-xs text-zinc-500 leading-tight">{user?.is_admin ? 'Administrador' : 'Usuário'}</div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6 bg-zinc-950">
          {children}
        </main>
      </div>
    </div>
  )
}
