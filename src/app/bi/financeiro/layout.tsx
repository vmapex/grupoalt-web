'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useThemeStore } from '@/store/themeStore'
import { useEmpresaStore } from '@/store/empresaStore'
import { useAuthStore } from '@/store/authStore'
import { useBiViewStore } from '@/store/biViewStore'
import { Navbar } from '@/components/nav/Navbar'
import { ChatPanel } from '@/components/chat/ChatPanel'
import { OrbitButton } from '@/components/chat/OrbitButton'
import { BarChart3, Sparkles } from 'lucide-react'
import api from '@/lib/api'

export default function BIFinanceiroLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { mode, tokens: t } = useThemeStore()
  const [chatOpen, setChatOpen] = useState(false)
  const biView = useBiViewStore((s) => s.view)
  const setBiView = useBiViewStore((s) => s.setView)
  const pathname = usePathname()
  const syncFromAuth = useEmpresaStore((s) => s.syncFromAuth)
  const synced = useEmpresaStore((s) => s._synced)
  const setAuth = useAuthStore((s) => s.setAuth)
  const user = useAuthStore((s) => s.user)

  // Auth guard: verify session via httpOnly cookie
  useEffect(() => {
    if (!user) {
      api.get('/auth/me')
        .then((res) => {
          const d = res.data
          setAuth(d.user || d, d.empresas || [], d.grupos || [], d.permissoes || [])
        })
        .catch(() => {
          router.push('/login')
        })
    }
  }, [router, user, setAuth])

  // Sync empresaStore from authStore once user data is loaded
  useEffect(() => {
    if (user && !synced) {
      syncFromAuth()
    }
  }, [user, synced, syncFromAuth])

  // Theme class on root
  useEffect(() => {
    const root = document.documentElement
    if (mode === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [mode])

  // Reset view to dashboard when navigating to a new page
  useEffect(() => {
    setBiView('dashboard')
  }, [pathname])

  // Close overlay chat when switching to analise (chat is embedded in the view)
  useEffect(() => {
    if (biView === 'analise' && chatOpen) {
      setChatOpen(false)
    }
  }, [biView]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative flex flex-col h-screen" style={{ background: t.bg, color: t.text }}>
      {/* Cinematic aurora backdrop — fixed canvas behind all BI content */}
      <div className="alt-bg-canvas" aria-hidden="true" />

      <div className="relative z-10 flex flex-col flex-1 min-h-0">
      <Navbar />
      {/* Sub-bar: Dashboard / Análise IA — visible on all BI pages */}
      <div
        className="flex items-center justify-between px-3 md:px-5 shrink-0"
        style={{
          height: 40,
          borderBottom: `1px solid ${t.border}`,
          background: t.isDark ? 'rgba(5,10,20,0.55)' : 'rgba(255,255,255,0.55)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        <div
          className="flex gap-0.5 rounded-full p-0.5"
          style={{ background: t.surface, border: `1px solid ${t.border}` }}
        >
          {[
            { id: 'dashboard' as const, label: 'Dashboard', Icon: BarChart3, accent: t.blue, dim: t.blueDim },
            { id: 'analise' as const, label: 'Análise IA', Icon: Sparkles, accent: t.gold, dim: t.goldDim },
          ].map((v) => (
            <button
              key={v.id}
              onClick={() => setBiView(v.id)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10.5px] border-none cursor-pointer transition-all"
              style={{
                color: biView === v.id ? v.accent : t.muted,
                background: biView === v.id ? v.dim : 'transparent',
                fontWeight: biView === v.id ? 600 : 500,
                letterSpacing: '0.02em',
              }}
            >
              <v.Icon size={11} strokeWidth={biView === v.id ? 2 : 1.6} />
              {v.label}
            </button>
          ))}
        </div>
        {biView === 'analise' && (
          <div
            className="flex items-center gap-1.5 px-3 py-1 rounded-full"
            style={{ background: t.goldDim, border: `1px solid ${t.borderGold}` }}
          >
            <div className="w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ background: t.gold, boxShadow: `0 0 8px ${t.gold}` }} />
            <span
              className="text-[9px]"
              style={{
                color: t.gold,
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                fontWeight: 600,
              }}
            >
              Agente IA ativo
            </span>
          </div>
        )}
      </div>
      <main className="flex-1 overflow-auto relative z-0">
        {children}
      </main>
      {biView !== 'analise' && (
        <>
          <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} currentPage={pathname} />
          {!chatOpen && <OrbitButton onClick={() => setChatOpen(true)} />}
        </>
      )}
      </div>
    </div>
  )
}
