'use client'
import { fmtK } from '@/lib/formatters'

interface BarLabelProps {
  x?: number
  y?: number
  width?: number
  value?: number
  fill: string
}

export function BarLabel({ x = 0, y = 0, width = 0, value, fill }: BarLabelProps) {
  if (!value || value === 0) return null
  return (
    <text
      x={x + width / 2}
      y={y - 5}
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
