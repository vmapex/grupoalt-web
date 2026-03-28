'use client'
import { Sun, Moon } from 'lucide-react'
import { useThemeStore } from '@/store/themeStore'

export function ThemeToggle() {
  const { mode, toggle, tokens: t } = useThemeStore()
  return (
    <button
      onClick={toggle}
      aria-label="Alternar tema"
      className="flex items-center justify-center w-8 h-8 rounded-lg transition-all cursor-pointer"
      style={{
        background: t.surface,
        border: `1px solid ${t.border}`,
        color: t.muted,
      }}
    >
      {mode === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
    </button>
  )
}
