'use client'
import { useThemeStore } from '@/store/themeStore'

interface BadgeProps {
  status: string
}

export function Badge({ status }: BadgeProps) {
  const t = useThemeStore((s) => s.tokens)
  const map: Record<string, { bg: string; color: string; label: string }> = {
    'A VENCER': { bg: t.greenDim, color: t.green, label: 'A Vencer' },
    ATRASADO: { bg: t.redDim, color: t.red, label: 'Atrasado' },
    PAGO: { bg: `${t.muted}15`, color: t.muted, label: 'Pago' },
    PARCIAL: { bg: t.amberDim, color: t.amber, label: 'Parcial' },
    'A RECEBER': { bg: t.blueDim, color: t.blue, label: 'A Receber' },
    RECEBIDO: { bg: `${t.muted}15`, color: t.muted, label: 'Recebido' },
  }
  const s = map[status] || map['A VENCER']
  return (
    <span
      className="inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-semibold"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.color}33` }}
    >
      {s.label}
    </span>
  )
}
