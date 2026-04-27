'use client'

interface GlowLineProps {
  color: string
  /** Position the line at the top (default) or bottom of the parent. */
  position?: 'top' | 'bottom'
}

/**
 * Hairline accent — a horizontal gradient streak used at the
 * top/bottom of cards and sections to mark interactivity.
 * Pairs with the design system's gold/blue accent language.
 */
export function GlowLine({ color, position = 'top' }: GlowLineProps) {
  return (
    <div
      className="absolute left-0 right-0 h-px pointer-events-none"
      style={{
        [position]: 0,
        background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
        opacity: 0.55,
      }}
    />
  )
}
