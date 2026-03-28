'use client'
import { useThemeStore } from '@/store/themeStore'
import { KPICard } from '@/components/ui/KPICard'

interface KPIStripProps {
  items: Array<{
    label: string
    value: string
    color: string
    accent: string
    sub?: string
  }>
}

export function KPIStrip({ items }: KPIStripProps) {
  const t = useThemeStore((s) => s.tokens)
  return (
    <div
      className="grid shrink-0"
      style={{
        gridTemplateColumns: `repeat(${items.length}, 1fr)`,
        borderBottom: `1px solid ${t.border}`,
      }}
    >
      {items.map((k, i) => (
        <KPICard
          key={i}
          label={k.label}
          value={k.value}
          color={k.color}
          accent={k.accent}
          sub={k.sub}
          borderRight={i < items.length - 1}
        />
      ))}
    </div>
  )
}
