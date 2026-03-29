'use client'
import { useState, useRef, useEffect, useMemo } from 'react'
import { Calendar } from 'lucide-react'
import { useThemeStore } from '@/store/themeStore'
import { useDateRangeStore } from '@/store/dateRangeStore'

export function DateRangePicker() {
  const t = useThemeStore((s) => s.tokens)
  const { from, to, setRange, days } = useDateRangeStore()
  const [open, setOpen] = useState(false)
  const [localFrom, setLocalFrom] = useState(from)
  const [localTo, setLocalTo] = useState(to)
  const ref = useRef<HTMLDivElement>(null)

  // Sync local state when store changes
  useEffect(() => { setLocalFrom(from); setLocalTo(to) }, [from, to])

  const currentDays = days()

  const presets = useMemo(() => {
    const now = new Date()
    const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
    const quarter = new Date(now.getFullYear(), now.getMonth() - 3, 1)
    const sixMonths = new Date(now.getFullYear(), now.getMonth() - 6, 1)
    const yearStart = new Date(now.getFullYear(), 0, 1)
    return [
      { label: 'Último mês', from: fmt(lastMonth), to: fmt(endLastMonth) },
      { label: 'Último trimestre', from: fmt(quarter), to: fmt(now) },
      { label: 'Últimos 6 meses', from: fmt(sixMonths), to: fmt(now) },
      { label: 'Ano atual', from: fmt(yearStart), to: fmt(now) },
    ]
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const applyRange = () => {
    setRange(localFrom, localTo)
    setOpen(false)
  }

  const localDays = Math.round(
    (new Date(localTo).getTime() - new Date(localFrom).getTime()) / 86400000,
  )

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
        <span className="font-mono">{currentDays}d</span>
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
            {presets.map((p) => (
              <button
                key={p.label}
                onClick={() => {
                  setLocalFrom(p.from)
                  setLocalTo(p.to)
                  setRange(p.from, p.to)
                  setOpen(false)
                }}
                className="text-left px-2 py-1.5 rounded text-[10px] transition-all cursor-pointer"
                style={{
                  background: localFrom === p.from && localTo === p.to ? t.blueDim : 'transparent',
                  color: localFrom === p.from && localTo === p.to ? t.blue : t.textSec,
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
              value={localFrom}
              onChange={(e) => setLocalFrom(e.target.value)}
              className="flex-1 rounded px-2 py-1 text-[10px] font-mono outline-none"
              style={{
                background: t.surface,
                border: `1px solid ${t.border}`,
                color: t.text,
              }}
            />
            <input
              type="date"
              value={localTo}
              onChange={(e) => setLocalTo(e.target.value)}
              className="flex-1 rounded px-2 py-1 text-[10px] font-mono outline-none"
              style={{
                background: t.surface,
                border: `1px solid ${t.border}`,
                color: t.text,
              }}
            />
          </div>
          <button
            onClick={applyRange}
            className="w-full py-1.5 rounded-md text-[10px] font-semibold cursor-pointer transition-all"
            style={{
              background: t.blueDim,
              border: `1px solid ${t.blue}33`,
              color: t.blue,
            }}
          >
            Aplicar Período · {localDays} dias
          </button>
        </div>
      )}
    </div>
  )
}
