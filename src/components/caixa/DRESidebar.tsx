'use client'
import { useState } from 'react'
import { useThemeStore } from '@/store/themeStore'
import { DRE_ROWS, getDREColor } from '@/lib/mocks/caixaData'
import { fmtK } from '@/lib/formatters'

export function DRESidebar() {
  const t = useThemeStore((s) => s.tokens)

  return (
    <div className="py-4 px-4 overflow-y-auto">
      <div
        className="text-[9px] uppercase tracking-[1.5px] mb-3.5"
        style={{ color: t.muted }}
      >
        DRE Realizado
      </div>
      {DRE_ROWS.map((row, i) => (
        <DRERow key={i} row={row} index={i} />
      ))}
    </div>
  )
}

function DRERow({ row, index }: { row: (typeof DRE_ROWS)[number]; index: number }) {
  const t = useThemeStore((s) => s.tokens)
  const c = getDREColor(row.name, t)
  const [hovered, setHovered] = useState(false)

  return (
    <div className="animate-fade-up" style={{ animationDelay: `${index * 0.035}s` }}>
      <div
        className="flex justify-between py-1.5 cursor-pointer transition-all"
        style={{
          borderBottom: `1px solid ${t.border}`,
          paddingLeft: hovered ? 4 : 0,
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div className="flex items-center gap-1.5">
          <div className="w-1 h-1 rounded-full" style={{ background: c }} />
          <span
            className="text-[10px] transition-colors"
            style={{ color: hovered ? t.text : t.muted }}
          >
            {row.name}
          </span>
        </div>
        <div className="text-right">
          <div
            className="font-mono text-[10px]"
            style={{ color: row.val < 0 ? t.red : t.text }}
          >
            {fmtK(row.val)}
          </div>
          <div
            className="text-[9px]"
            style={{ color: row.pct < 0 ? `${t.red}88` : t.muted }}
          >
            {row.pct.toFixed(1)}%
          </div>
        </div>
      </div>
      <div
        className="rounded-sm mt-1 mb-0.5 overflow-hidden"
        style={{ height: 1.5, background: `${t.text}08` }}
      >
        <div
          className="h-full rounded-sm transition-[width] duration-700"
          style={{
            width: `${Math.min(Math.abs(row.pct), 100)}%`,
            background: c,
            opacity: 0.55,
          }}
        />
      </div>
    </div>
  )
}
