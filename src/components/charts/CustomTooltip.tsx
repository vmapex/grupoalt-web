'use client'
import { useThemeStore } from '@/store/themeStore'
import { fmtK } from '@/lib/formatters'

interface TooltipPayload {
  value: number
  name: string
  color?: string
  stroke?: string
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayload[]
  label?: string
}

export function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  const t = useThemeStore((s) => s.tokens)
  if (!active || !payload?.length) return null
  return (
    <div
      className="rounded-lg"
      style={{
        background: t.surfaceElevated,
        border: `1px solid ${t.borderHover}`,
        padding: '10px 14px',
        boxShadow: t.tooltipShadow,
      }}
    >
      <div className="text-[10px] font-mono mb-1.5" style={{ color: t.muted }}>
        {label}
      </div>
      {payload
        .filter((p) => p.value > 0)
        .map((p, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[11px] mb-0.5">
            <div
              className="w-1.5 h-1.5 rounded-sm"
              style={{ background: p.color || p.stroke }}
            />
            <span style={{ color: t.textSec }}>{p.name}:</span>
            <span className="font-mono font-medium" style={{ color: t.text }}>
              {fmtK(p.value)}
            </span>
          </div>
        ))}
    </div>
  )
}
