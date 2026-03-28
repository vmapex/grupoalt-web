'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Cookies from 'js-cookie'
import { useThemeStore } from '@/store/themeStore'
import { Navbar } from '@/components/nav/Navbar'
import { ChatPanel } from '@/components/chat/ChatPanel'
import { OrbitButton } from '@/components/chat/OrbitButton'

export default function BIFinanceiroLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { mode, tokens: t } = useThemeStore()
  const [chatOpen, setChatOpen] = useState(false)
  const pathname = usePathname()

  // Auth guard: verify token exists (cookie shared across same origin)
  useEffect(() => {
    const token = Cookies.get('access_token')
    if (!token) {
      router.push('/login')
    }
  }, [router])

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
