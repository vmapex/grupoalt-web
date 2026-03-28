'use client'
import { useState } from 'react'
import { useThemeStore } from '@/store/themeStore'

interface KPICardProps {
  label: string
  value: string
  color: string
  accent: string
  sub?: string
  borderRight?: boolean
}

export function KPICard({ label, value, color, accent, sub, borderRight = true }: KPICardProps) {
  const t = useThemeStore((s) => s.tokens)
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className="relative overflow-hidden cursor-default transition-colors animate-fade-up"
      style={{
        padding: '14px 22px',
        borderRight: borderRight ? `1px solid ${t.border}` : 'none',
        background: hovered ? t.surfaceHover : 'transparent',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="absolute bottom-0 left-0 right-0 transition-opacity"
        style={{
          height: 1.5,
          background: accent,
          opacity: hovered ? 1 : 0,
        }}
      />
      <div className="text-[9px] uppercase tracking-wider mb-1.5" style={{ color: t.muted }}>
        {label}
      </div>
      <div className="font-mono text-xl" style={{ color }}>
        {value}
      </div>
      {sub && (
        <div className="text-[9px] mt-0.5" style={{ color: t.muted }}>
          {sub}
        </div>
      )}
    </div>
  )
}
