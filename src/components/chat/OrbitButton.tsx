'use client'
import { useThemeStore } from '@/store/themeStore'
import { Orbit } from 'lucide-react'

interface OrbitButtonProps {
  onClick: () => void
}

export function OrbitButton({ onClick }: OrbitButtonProps) {
  const t = useThemeStore((s) => s.tokens)

  return (
    <button
      onClick={onClick}
      className="fixed z-40 flex items-center justify-center rounded-full transition-all duration-200 cursor-pointer group"
      style={{
        bottom: 24,
        right: 24,
        width: 52,
        height: 52,
        background: `linear-gradient(135deg, ${t.blue}, ${t.purple})`,
        boxShadow: `0 4px 20px ${t.blue}44, 0 0 40px ${t.purple}22`,
      }}
      aria-label="Abrir assistente Orbit"
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.08)'
        e.currentTarget.style.boxShadow = `0 6px 28px ${t.blue}66, 0 0 60px ${t.purple}33`
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)'
        e.currentTarget.style.boxShadow = `0 4px 20px ${t.blue}44, 0 0 40px ${t.purple}22`
      }}
    >
      <Orbit
        size={22}
        color="#fff"
        className="transition-all duration-200 group-hover:animate-[spin_5s_linear_infinite]"
      />
    </button>
  )
}
