'use client'
import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Building2, Check } from 'lucide-react'
import { useThemeStore } from '@/store/themeStore'
import { useEmpresaStore, getLogo } from '@/store/empresaStore'

export function EmpresaDropdown() {
  const t = useThemeStore((s) => s.tokens)
  const { empresas, activeId, setActive, getActive } = useEmpresaStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const active = getActive()

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const logo = getLogo(active, t.isDark)

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] cursor-pointer transition-all"
        style={{
          background: t.surface,
          border: `1px solid ${t.border}`,
          color: t.text,
          fontFamily: 'inherit',
        }}
      >
        {logo ? (
          <img src={logo} alt={active.nome} className="h-4" />
        ) : (
          <Building2 size={12} style={{ color: active.cor }} />
        )}
        <span className="max-w-[100px] truncate">{active.nome}</span>
        <ChevronDown
          size={11}
          className="transition-transform"
          style={{ transform: open ? 'rotate(180deg)' : 'none' }}
        />
      </button>
      {open && (
        <div
          className="absolute right-0 top-[calc(100%+4px)] rounded-lg overflow-hidden z-50 min-w-[180px]"
          style={{
            background: t.surfaceElevated,
            border: `1px solid ${t.borderHover}`,
            boxShadow: t.tooltipShadow,
          }}
        >
          {empresas.map((e) => (
            <button
              key={e.id}
              onClick={() => {
                setActive(e.id)
                setOpen(false)
              }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-[10px] transition-colors cursor-pointer"
              style={{
                color: activeId === e.id ? t.blue : t.textSec,
                background: 'transparent',
                border: 'none',
                fontFamily: 'inherit',
              }}
            >
              <Building2 size={11} style={{ color: e.cor }} />
              <span className="flex-1">{e.nome}</span>
              {activeId === e.id && <Check size={11} style={{ color: t.blue }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
