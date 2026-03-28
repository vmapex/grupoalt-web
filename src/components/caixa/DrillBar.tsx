'use client'
import { useThemeStore } from '@/store/themeStore'

type Level = 'quarterly' | 'monthly' | 'weekly'
const LEVEL_LABELS: Record<Level, string> = {
  quarterly: 'Trimestral',
  monthly: 'Mensal',
  weekly: 'Semanal',
}

interface DrillBarProps {
  level: Level
  selMonth: string | null
  onJumpTo: (lv: Level) => void
  onDrillUp: () => void
  onDrillDown: () => void
}

export function DrillBar({ level, selMonth, onJumpTo, onDrillUp, onDrillDown }: DrillBarProps) {
  const t = useThemeStore((s) => s.tokens)

  const levelColors: Record<Level, { border: string; color: string; bg: string }> = {
    quarterly: { border: `${t.amber}66`, color: t.amber, bg: `${t.amber}0F` },
    monthly: { border: `${t.blue}66`, color: t.blue, bg: `${t.blue}0F` },
    weekly: { border: `${t.green}66`, color: t.green, bg: `${t.green}0F` },
  }
  const lc = levelColors[level]

  return (
    <div className="flex items-center justify-between mb-3.5">
      <div className="flex items-center gap-2.5">
        <span className="text-[11px] font-semibold" style={{ color: t.text }}>
          Granularidade
        </span>
        <div className="flex items-center gap-1.5 text-[10px] font-mono" style={{ color: t.muted }}>
          <span
            onClick={() => onJumpTo('quarterly')}
            className="cursor-pointer transition-colors"
            style={{ color: level === 'quarterly' ? t.blue : t.muted }}
          >
            Trimestral
          </span>
          {level !== 'quarterly' && (
            <>
              <span className="opacity-40">›</span>
              <span
                onClick={() => onJumpTo('monthly')}
                className="cursor-pointer"
                style={{ color: level === 'monthly' ? t.blue : t.muted }}
              >
                Mensal
              </span>
            </>
          )}
          {level === 'weekly' && (
            <>
              <span className="opacity-40">›</span>
              <span style={{ color: t.blue }}>{selMonth}</span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <span
          className="px-2.5 py-1 rounded-md text-[9px] font-mono tracking-wide"
          style={{ border: `1px solid ${lc.border}`, color: lc.color, background: lc.bg }}
        >
          {LEVEL_LABELS[level]}
          {selMonth ? ` · ${selMonth}` : ''}
        </span>
        <button
          onClick={onDrillUp}
          disabled={level === 'quarterly'}
          className="flex items-center gap-1 px-3 py-1 rounded-lg text-[10px] transition-all cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed"
          style={{
            border: `1px solid ${t.border}`,
            background: t.surface,
            color: t.muted,
            fontFamily: 'inherit',
          }}
        >
          ▲ Drill Up
        </button>
        <button
          onClick={onDrillDown}
          disabled={level === 'weekly'}
          className="flex items-center gap-1 px-3 py-1 rounded-lg text-[10px] transition-all cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed"
          style={{
            border: `1px solid ${t.border}`,
            background: t.surface,
            color: t.muted,
            fontFamily: 'inherit',
          }}
        >
          ▼ Drill Down
        </button>
      </div>
    </div>
  )
}
