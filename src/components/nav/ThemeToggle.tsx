'use client'
import { Sun, Moon } from 'lucide-react'
import { useThemeStore } from '@/store/themeStore'

/**
 * Theme switch — pill toggle with animated icon swap.
 * Uses the gold accent on hover (per design system).
 */
export function ThemeToggle() {
  const { mode, toggle, tokens: t } = useThemeStore()
  const isDark = mode === 'dark'

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
      title={isDark ? 'Modo claro' : 'Modo escuro'}
      className="group relative flex items-center justify-center w-8 h-8 rounded-lg overflow-hidden transition-all duration-300 ease-out cursor-pointer"
      style={{
        background: t.surface,
        border: `1px solid ${t.border}`,
        color: t.muted,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = t.borderGold
        e.currentTarget.style.color = t.gold
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = t.border
        e.currentTarget.style.color = t.muted
      }}
    >
      {/* Sun icon — visible in dark mode */}
      <Sun
        size={13}
        strokeWidth={2}
        className="absolute transition-all duration-500 ease-out"
        style={{
          opacity: isDark ? 1 : 0,
          transform: isDark ? 'translateY(0) rotate(0deg)' : 'translateY(-130%) rotate(-90deg)',
        }}
      />
      {/* Moon icon — visible in light mode */}
      <Moon
        size={13}
        strokeWidth={2}
        className="absolute transition-all duration-500 ease-out"
        style={{
          opacity: isDark ? 0 : 1,
          transform: isDark ? 'translateY(130%) rotate(90deg)' : 'translateY(0) rotate(0deg)',
        }}
      />
    </button>
  )
}
