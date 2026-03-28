'use client'
import { useState, useRef, useEffect } from 'react'
import { MapPin, ChevronDown, Check } from 'lucide-react'
import { useThemeStore } from '@/store/themeStore'
import { useUnidadeStore } from '@/store/unidadeStore'

export function UnidadeDropdown() {
  const t = useThemeStore((s) => s.tokens)
  const { projetos, activeProjetoId, setActive, getActive, loading } = useUnidadeStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Não renderiza se não há projetos para esta empresa
  if (projetos.length === 0) return null

  const active = getActive()
  const label = active ? active.nome : 'Todas unidades'

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] cursor-pointer transition-all"
        style={{
          background: activeProjetoId ? t.blueDim : t.surface,
          border: `1px solid ${activeProjetoId ? `${t.blue}44` : t.border}`,
          color: activeProjetoId ? t.blue : t.muted,
          fontFamily: 'inherit',
        }}
      >
        <MapPin size={11} />
        <span className="max-w-[120px] truncate">{loading ? '...' : label}</span>
        <ChevronDown
          size={11}
          className="transition-transform"
          style={{ transform: open ? 'rotate(180deg)' : 'none' }}
        />
      </button>
      {open && (
        <div
          className="absolute right-0 top-[calc(100%+4px)] rounded-lg overflow-hidden z-50 min-w-[200px]"
          style={{
            background: t.surfaceElevated,
            border: `1px solid ${t.borderHover}`,
            boxShadow: t.tooltipShadow,
          }}
        >
          <div className="px-3 py-2 text-[8px] uppercase tracking-wider" style={{ color: t.muted, borderBottom: `1px solid ${t.border}` }}>
            Filtrar por unidade
          </div>

          {/* Opção "Todas" */}
          <button
            onClick={() => { setActive(null); setOpen(false) }}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-[10px] transition-colors cursor-pointer"
            style={{
              color: !activeProjetoId ? t.blue : t.textSec,
              background: !activeProjetoId ? t.blueDim : 'transparent',
              border: 'none',
              fontFamily: 'inherit',
            }}
          >
            <MapPin size={11} style={{ color: t.muted }} />
            <span className="flex-1">Todas as unidades</span>
            {!activeProjetoId && <Check size={11} style={{ color: t.blue }} />}
          </button>

          <div style={{ height: 1, background: t.border }} />

          {/* Lista de projetos/unidades */}
          {projetos.map((p) => (
            <button
              key={p.id}
              onClick={() => { setActive(p.id); setOpen(false) }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-[10px] transition-colors cursor-pointer"
              style={{
                color: activeProjetoId === p.id ? t.blue : t.textSec,
                background: 'transparent',
                border: 'none',
                fontFamily: 'inherit',
              }}
            >
              <div
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: activeProjetoId === p.id ? t.blue : t.muted }}
              />
              <div className="flex-1">
                <div>{p.nome}</div>
                <div className="font-mono text-[8px] mt-px" style={{ color: t.mutedDim }}>{p.codigo}</div>
              </div>
              {activeProjetoId === p.id && <Check size={11} style={{ color: t.blue }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
