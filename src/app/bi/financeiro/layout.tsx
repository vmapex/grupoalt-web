'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useThemeStore } from '@/store/themeStore'
import { useEmpresaStore } from '@/store/empresaStore'
import { useAuthStore } from '@/store/authStore'
import { Navbar } from '@/components/nav/Navbar'
import { ChatPanel } from '@/components/chat/ChatPanel'
import { OrbitButton } from '@/components/chat/OrbitButton'
import { BarChart3, Sparkles } from 'lucide-react'
import api from '@/lib/api'

export default function BIFinanceiroLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { mode, tokens: t } = useThemeStore()
  const [chatOpen, setChatOpen] = useState(false)
  const [biView, setBiView] = useState<'dashboard' | 'analise'>('dashboard')
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

  // Auto-open chat when switching to Análise IA mode
  useEffect(() => {
    if (biView === 'analise' && !chatOpen) {
      setChatOpen(true)
    }
  }, [biView]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col h-screen" style={{ background: t.bg, color: t.text }}>
      <Navbar />
      {/* Sub-bar: Dashboard / Análise IA — visible on all BI pages */}
      <div
        className="flex items-center justify-between px-3 md:px-5 shrink-0"
        style={{ height: 38, borderBottom: `1px solid ${t.border}`, background: `${t.bg}CC` }}
      >
        <div className="flex gap-0.5 rounded-lg p-0.5" style={{ background: `${t.text}06` }}>
          {[
            { id: 'dashboard' as const, label: 'Dashboard', Icon: BarChart3, accent: t.blue, dim: t.blueDim },
            { id: 'analise' as const, label: 'Análise IA', Icon: Sparkles, accent: t.purple, dim: t.purpleDim },
          ].map((v) => (
            <button
              key={v.id}
              onClick={() => setBiView(v.id)}
              className="flex items-center gap-1.5 px-3.5 py-1 rounded-md text-[10px] border-none cursor-pointer transition-all"
              style={{
                color: biView === v.id ? v.accent : t.muted,
                background: biView === v.id ? v.dim : 'transparent',
                fontWeight: biView === v.id ? 600 : 400,
              }}
            >
              <v.Icon size={11} strokeWidth={biView === v.id ? 2 : 1.5} />
              {v.label}
            </button>
          ))}
        </div>
        {biView === 'analise' && (
          <div
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg"
            style={{ background: `${t.purple}0A`, border: `1px solid ${t.purple}22` }}
          >
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: t.purple }} />
            <span className="text-[9px] font-semibold" style={{ color: t.purple }}>Agente IA ativo</span>
          </div>
        )}
      </div>
      <main className="flex-1 overflow-auto">
        {children}
      </main>
      <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} currentPage={pathname} />
      {!chatOpen && <OrbitButton onClick={() => setChatOpen(true)} />}
    </div>
  )
}
