'use client'
import { useThemeStore } from '@/store/themeStore'

interface BadgeProps {
  status: string
}

/**
 * Status pill — uppercase mono label with tinted background and subtle border,
 * matching the design system's `.badge` family.
 */
export function Badge({ status }: BadgeProps) {
  const t = useThemeStore((s) => s.tokens)
  const map: Record<string, { bg: string; color: string; label: string }> = {
    'A VENCER':  { bg: t.greenDim,           color: t.green,  label: 'A Vencer' },
    ATRASADO:    { bg: t.redDim,             color: t.red,    label: 'Atrasado' },
    PAGO:        { bg: `${t.muted}1A`,       color: t.muted,  label: 'Pago' },
    PARCIAL:     { bg: t.amberDim,           color: t.amber,  label: 'Parcial' },
    'A RECEBER': { bg: t.blueDim,            color: t.blue,   label: 'A Receber' },
    RECEBIDO:    { bg: `${t.muted}1A`,       color: t.muted,  label: 'Recebido' },
  }
  const s = map[status] || map['A VENCER']
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px]"
      style={{
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.color}40`,
        fontFamily: 'var(--font-mono)',
        fontWeight: 500,
        letterSpacing: '0.10em',
        textTransform: 'uppercase',
      }}
    >
      {s.label}
    </span>
  )
}
