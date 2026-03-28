'use client'
import { fmtK } from '@/lib/formatters'

interface BarLabelVarProps {
  x?: number
  y?: number
  width?: number
  value?: number
  fill: string
  index?: number
  data: Array<{ [key: string]: number | string }>
  dataKey: string
}

export function BarLabelVar({ x = 0, y = 0, width = 0, value, fill, index = 0, data, dataKey }: BarLabelVarProps) {
  if (!value || value === 0) return null
  const prev = index > 0 ? (data[index - 1]?.[dataKey] as number) : null
  const varPct = prev && prev > 0 ? ((value - prev) / prev) * 100 : null
  const hasVar = varPct !== null && index > 0
  return (
    <g>
      {hasVar && (
        <text
          x={x + width / 2}
          y={y - 22}
          textAnchor="middle"
          fontSize={10}
          fontFamily="DM Mono, monospace"
          fontWeight="normal"
          fill={varPct >= 0 ? '#34D399' : '#F87171'}
        >
          {varPct >= 0 ? '▲' : '▼'} {Math.abs(varPct).toFixed(1)}%
        </text>
      )}
      <text
        x={x + width / 2}
        y={y - 6}
        textAnchor="middle"
        fill={fill}
        fontSize={11}
        fontFamily="DM Mono, monospace"
        fontWeight="normal"
        opacity={0.85}
      >
        {fmtK(value)}
      </text>
    </g>
  )
}
