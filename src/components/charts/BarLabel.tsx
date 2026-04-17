'use client'
import { fmtK } from '@/lib/formatters'

interface BarLabelProps {
  x?: number
  y?: number
  width?: number
  height?: number
  value?: number
  fill: string
}

export function BarLabel({ x = 0, y = 0, width = 0, height = 0, value, fill }: BarLabelProps) {
  if (!value || value === 0) return null
  // Recharts renders negative bars with y at the zero-line and positive height,
  // so y + height is always the bottom edge of the bar. Place the label there
  // for negatives, and just above y for positives — never inside the bar.
  const labelY = value < 0 ? y + height + 10 : y - 5
  return (
    <text
      x={x + width / 2}
      y={labelY}
      textAnchor="middle"
      fill={fill}
      fontSize={8}
      fontFamily="DM Mono, monospace"
      fontWeight="normal"
      opacity={0.75}
    >
      {fmtK(value)}
    </text>
  )
}
