'use client'
import { useThemeStore } from '@/store/themeStore'

interface ConcilBadgeProps {
  ok: boolean
}

export function ConcilBadge({ ok }: ConcilBadgeProps) {
  const t = useThemeStore((s) => s.tokens)
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-semibold"
      style={{
        background: ok ? t.greenDim : t.amberDim,
        color: ok ? t.green : t.amber,
        border: `1px solid ${ok ? t.green : t.amber}33`,
      }}
    >
      {ok ? '✓ Conciliado' : '⏳ Pendente'}
    </span>
  )
}
