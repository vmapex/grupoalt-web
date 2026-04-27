'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { useEmpresaStore } from '@/store/empresaStore'
import Sidebar from '@/components/Sidebar'
import { HelpCircle, ChevronRight, ChevronDown, Menu } from 'lucide-react'
import { useThemeStore } from '@/store/themeStore'
import { ThemeToggle } from '@/components/nav/ThemeToggle'
import { NotificationBell } from '@/components/nav/NotificationBell'
import { ChatPanel } from '@/components/chat/ChatPanel'
import { OrbitButton } from '@/components/chat/OrbitButton'
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
  const t = useThemeStore((s) => s.tokens)
  const [chatOpen, setChatOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [hoverHelpBtn, setHoverHelpBtn] = useState(false)
  const [hoverUserBtn, setHoverUserBtn] = useState(false)

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
      <div className="relative flex items-center justify-center h-screen" style={{ background: t.bg }}>
        <div className="alt-bg-canvas" aria-hidden="true" />
        <div className="relative z-10 flex items-center gap-3">
          <div
            className="w-2 h-2 rounded-full animate-pulse-dot"
            style={{ background: t.gold, boxShadow: t.goldGlow }}
          />
          <span
            className="text-[11px]"
            style={{
              color: t.muted,
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
            }}
          >
            Carregando portal
          </span>
        </div>
      </div>
    )
  }

  return (
    <div
      className="relative flex h-screen overflow-hidden"
      style={{
        background: t.bg,
        color: t.text,
        fontFamily: "var(--font-body)",
      }}
    >
      <div className="alt-bg-canvas" aria-hidden="true" />
      <Sidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="relative z-10 flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header
          className="h-14 flex items-center justify-between px-6 flex-shrink-0 relative"
          style={{
            borderBottom: `1px solid ${t.border}`,
            background: themeMode === 'dark' ? 'rgba(5,10,20,0.72)' : 'rgba(255,255,255,0.78)',
            backdropFilter: 'blur(20px) saturate(140%)',
            WebkitBackdropFilter: 'blur(20px) saturate(140%)',
          }}
        >
          <div
            className="absolute left-0 right-0 bottom-0 h-px pointer-events-none"
            style={{
              background: `linear-gradient(90deg, transparent, ${t.borderGold}, transparent)`,
              opacity: 0.5,
            }}
          />
          {/* Hamburger (mobile) + Breadcrumb */}
          <div className="flex items-center gap-2 text-sm">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 rounded-xl transition-all"
              style={{ color: t.muted }}
              aria-label="Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span
              style={{
                color: t.gold,
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
              }}
            >
              Portal
            </span>
            {breadcrumb.map((part, i) => (
              <span key={i} className="flex items-center gap-2">
                <ChevronRight className="w-3 h-3" style={{ color: t.mutedDim }} />
                <span
                  style={{
                    color: i === breadcrumb.length - 1 ? t.text : t.muted,
                    fontFamily: i === breadcrumb.length - 1 ? 'var(--font-display)' : 'var(--font-body)',
                    fontWeight: i === breadcrumb.length - 1 ? 400 : 500,
                    fontSize: 14,
                    letterSpacing: i === breadcrumb.length - 1 ? '-0.005em' : 0,
                  }}
                >
                  {part}
                </span>
              </span>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {/* Notification Bell — full dropdown panel */}
            <NotificationBell />
            {/* Theme Toggle */}
            <ThemeToggle />
            {/* Help */}
            <button
              className="p-2 rounded-xl transition-all"
              style={{
                color: hoverHelpBtn ? t.text : t.muted,
                background: hoverHelpBtn ? t.surfaceHover : 'transparent',
              }}
              onMouseEnter={() => setHoverHelpBtn(true)}
              onMouseLeave={() => setHoverHelpBtn(false)}
            >
              <HelpCircle className="w-[18px] h-[18px]" />
            </button>

            <div className="w-px h-6" style={{ background: t.border }} />

            {/* User */}
            <button
              className="flex items-center gap-2.5 py-1.5 px-2 rounded-xl transition-all"
              style={{
                background: hoverUserBtn ? t.surfaceHover : 'transparent',
                border: `1px solid ${hoverUserBtn ? t.border : 'transparent'}`,
              }}
              onMouseEnter={() => setHoverUserBtn(true)}
              onMouseLeave={() => setHoverUserBtn(false)}
            >
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold"
                style={{
                  background: `linear-gradient(135deg, ${t.gold}, ${t.goldSoft})`,
                  color: '#1A1718',
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.04em',
                  boxShadow: `inset 0 1px 0 rgba(255,255,255,0.3), 0 4px 10px ${t.goldDim}`,
                  border: `1px solid ${t.borderGold}`,
                }}
              >
                {userInitials}
              </div>
              <div className="text-left">
                <div
                  className="text-sm font-medium leading-tight"
                  style={{ color: t.text, fontFamily: 'var(--font-display)', letterSpacing: '-0.005em' }}
                >
                  {user?.nome?.split(' ').slice(0, 2).join(' ')}
                </div>
                <div
                  className="text-[10px] leading-tight"
                  style={{
                    color: t.muted,
                    fontFamily: 'var(--font-mono)',
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    marginTop: 2,
                  }}
                >
                  {user?.is_admin ? 'Administrador' : 'Usuário'}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5" style={{ color: t.muted }} />
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6 relative z-0">
          {children}
        </main>
      </div>

      {/* Orbit Chat */}
      <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} currentPage={pathname} />
      {!chatOpen && <OrbitButton onClick={() => setChatOpen(true)} />}
    </div>
  )
}
