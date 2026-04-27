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

/**
 * KPI cell — used inside KPI strips. Now wears the design system's
 * metric card flavor: monospace label, display-font value, and a
 * subtle radial gold accent revealed on hover.
 */
export function KPICard({ label, value, color, accent, sub, borderRight = true }: KPICardProps) {
  const t = useThemeStore((s) => s.tokens)
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className="relative overflow-hidden cursor-default transition-all animate-fade-up"
      style={{
        padding: '16px 22px',
        borderRight: borderRight ? `1px solid ${t.border}` : 'none',
        background: hovered ? t.surfaceHover : 'transparent',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Radial gold accent — subtle, only on hover */}
      <div
        className="absolute -top-12 -right-12 w-32 h-32 rounded-full pointer-events-none transition-opacity duration-500"
        style={{
          background: `radial-gradient(circle, ${accent}40, transparent 70%)`,
          opacity: hovered ? 1 : 0,
        }}
      />
      {/* Active accent line at the bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 transition-all duration-300"
        style={{
          height: 2,
          background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
          opacity: hovered ? 1 : 0,
        }}
      />

      <div
        className="text-[10px] mb-1.5"
        style={{
          color: t.muted,
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          fontWeight: 500,
        }}
      >
        {label}
      </div>
      <div
        className="leading-none"
        style={{
          color,
          fontFamily: 'var(--font-display)',
          fontSize: 26,
          letterSpacing: '-0.02em',
          fontWeight: 400,
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          className="text-[10px] mt-1.5"
          style={{
            color: t.muted,
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.04em',
          }}
        >
          {sub}
        </div>
      )}
    </div>
  )
}
