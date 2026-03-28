'use client'
import { useState, useRef, useEffect } from 'react'
import { Calendar } from 'lucide-react'
import { useThemeStore } from '@/store/themeStore'

const PRESETS = [
  { label: 'Último mês', from: '2025-11-01', to: '2025-11-30', days: 30 },
  { label: 'Último trimestre', from: '2025-10-01', to: '2025-12-31', days: 92 },
  { label: 'Últimos 6 meses', from: '2025-10-01', to: '2026-03-31', days: 182 },
  { label: 'Ano atual', from: '2026-01-01', to: '2026-03-31', days: 90 },
  { label: 'Personalizado', from: '', to: '', days: 0 },
]

export function DateRangePicker() {
  const t = useThemeStore((s) => s.tokens)
  const [open, setOpen] = useState(false)
  const [from, setFrom] = useState('2025-10-01')
  const [to, setTo] = useState('2026-03-31')
  const ref = useRef<HTMLDivElement>(null)

  const days = Math.round(
    (new Date(to).getTime() - new Date(from).getTime()) / 86400000,
  )

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] cursor-pointer transition-all"
        style={{
          background: t.surface,
          border: `1px solid ${t.border}`,
          color: t.muted,
          fontFamily: 'inherit',
        }}
      >
        <Calendar size={11} />
        <span className="font-mono">{days}d</span>
      </button>
      {open && (
        <div
          className="absolute right-0 top-[calc(100%+4px)] rounded-lg z-50 p-3 min-w-[240px]"
          style={{
            background: t.surfaceElevated,
            border: `1px solid ${t.borderHover}`,
            boxShadow: t.tooltipShadow,
          }}
        >
          <div className="text-[9px] uppercase tracking-wider mb-2" style={{ color: t.muted }}>
            Período
          </div>
          <div className="flex flex-col gap-1 mb-3">
            {PRESETS.slice(0, 4).map((p) => (
              <button
                key={p.label}
                onClick={() => {
                  setFrom(p.from)
                  setTo(p.to)
                }}
                className="text-left px-2 py-1.5 rounded text-[10px] transition-all cursor-pointer"
                style={{
                  background: from === p.from && to === p.to ? t.blueDim : 'transparent',
                  color: from === p.from && to === p.to ? t.blue : t.textSec,
                  border: 'none',
                  fontFamily: 'inherit',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 mb-3">
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="flex-1 rounded px-2 py-1 text-[10px] font-mono outline-none"
              style={{
                background: t.surface,
                border: `1px solid ${t.border}`,
                color: t.text,
              }}
            />
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="flex-1 rounded px-2 py-1 text-[10px] font-mono outline-none"
              style={{
                background: t.surface,
                border: `1px solid ${t.border}`,
                color: t.text,
              }}
            />
          </div>
          <button
            onClick={() => setOpen(false)}
            className="w-full py-1.5 rounded-md text-[10px] font-semibold cursor-pointer transition-all"
            style={{
              background: t.blueDim,
              border: `1px solid ${t.blue}33`,
              color: t.blue,
            }}
          >
            Aplicar Período · {days} dias
          </button>
        </div>
      )}
    </div>
  )
}
