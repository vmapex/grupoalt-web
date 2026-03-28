'use client'
import { useEffect } from 'react'
import { useThemeStore } from '@/store/themeStore'
import { Navbar } from '@/components/nav/Navbar'

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const { mode, tokens: t } = useThemeStore()

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
    </div>
  )
}
