'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Cookies from 'js-cookie'
import { useThemeStore } from '@/store/themeStore'
import { useEmpresaStore } from '@/store/empresaStore'
import { useAuthStore } from '@/store/authStore'
import { Navbar } from '@/components/nav/Navbar'
import { ChatPanel } from '@/components/chat/ChatPanel'
import { OrbitButton } from '@/components/chat/OrbitButton'
import api from '@/lib/api'

export default function BIFinanceiroLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { mode, tokens: t } = useThemeStore()
  const [chatOpen, setChatOpen] = useState(false)
  const pathname = usePathname()
  const syncFromAuth = useEmpresaStore((s) => s.syncFromAuth)
  const synced = useEmpresaStore((s) => s._synced)
  const setAuth = useAuthStore((s) => s.setAuth)
  const user = useAuthStore((s) => s.user)

  // Auth guard: verify token and load user data
  useEffect(() => {
    const token = Cookies.get('access_token')
    if (!token) {
      router.push('/login')
      return
    }
    // Load user data if not already loaded (e.g. navigated directly to /bi)
    if (!user) {
      api.get('/auth/me')
        .then((res) => {
          const d = res.data
          setAuth(token, d.user || d, d.empresas || [], d.grupos || [], d.permissoes || [])
        })
        .catch(() => {
          Cookies.remove('access_token')
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

  return (
    <div className="flex flex-col h-screen" style={{ background: t.bg, color: t.text }}>
      <Navbar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
      <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} currentPage={pathname} />
      {!chatOpen && <OrbitButton onClick={() => setChatOpen(true)} />}
    </div>
  )
}
