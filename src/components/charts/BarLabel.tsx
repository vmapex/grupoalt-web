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
  // Recharts posiciona o rect da barra em (x, y) com height sempre positivo:
  // - valor positivo: y = topo da barra, y + height = linha zero
  // - valor negativo: y = linha zero, y + height = fundo da barra
  // Sempre deslocamos o label pra FORA da barra para nunca ficar dentro.
  const labelY = value < 0 ? y + height + 10 : y - 5
  return (
    <text
      x={x + width / 2}
      y={labelY}
      textAnchor="middle"
      fill={fill}
      fontSize={8}
      fontFamily="JetBrains Mono, monospace"
      fontWeight="normal"
      opacity={0.75}
    >
      {fmtK(value)}
    </text>
  )
}
