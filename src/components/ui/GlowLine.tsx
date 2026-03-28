'use client'

interface GlowLineProps {
  color: string
}

export function GlowLine({ color }: GlowLineProps) {
  return (
    <div
      className="absolute top-0 left-0 right-0 h-px opacity-50"
      style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
    />
  )
}
