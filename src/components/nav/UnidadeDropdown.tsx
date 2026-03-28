'use client'
import { useState, useRef, useEffect } from 'react'
import { MapPin, ChevronDown, Check, Square, CheckSquare } from 'lucide-react'
import { useThemeStore } from '@/store/themeStore'
import { useUnidadeStore } from '@/store/unidadeStore'

export function UnidadeDropdown() {
  const t = useThemeStore((s) => s.tokens)
  const { projetos, selectedIds, toggle, selectAll, isSelected, isAllSelected, loading } = useUnidadeStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  if (projetos.length === 0) return null

  const allSelected = isAllSelected()
  const count = selectedIds.length

  // Label dinâmico
  let label = 'Todas unidades'
  if (count === 1) {
    const p = projetos.find((p) => p.id === selectedIds[0])
    label = p?.nome || '1 unidade'
  } else if (count > 1) {
    label = `${count} unidades`
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] cursor-pointer transition-all"
        style={{
          background: !allSelected ? t.blueDim : t.surface,
          border: `1px solid ${!allSelected ? `${t.blue}44` : t.border}`,
          color: !allSelected ? t.blue : t.muted,
          fontFamily: 'inherit',
        }}
      >
        <MapPin size={11} />
        <span className="max-w-[120px] truncate">{loading ? '...' : label}</span>
        {!allSelected && (
          <span
            className="flex items-center justify-center w-3.5 h-3.5 rounded-full text-[8px] font-mono font-bold"
            style={{ background: t.blue, color: t.bg }}
          >
            {count}
          </span>
        )}
        <ChevronDown
          size={11}
          className="transition-transform"
          style={{ transform: open ? 'rotate(180deg)' : 'none' }}
        />
      </button>
      {open && (
        <div
          className="absolute right-0 top-[calc(100%+4px)] rounded-lg overflow-hidden z-50 min-w-[220px]"
          style={{
            background: t.surfaceElevated,
            border: `1px solid ${t.borderHover}`,
            boxShadow: t.tooltipShadow,
          }}
        >
          <div
            className="px-3 py-2 text-[8px] uppercase tracking-wider flex items-center justify-between"
            style={{ color: t.muted, borderBottom: `1px solid ${t.border}` }}
          >
            <span>Filtrar por unidade</span>
            {!allSelected && (
              <span className="font-mono" style={{ color: t.blue }}>{count} selecionada{count > 1 ? 's' : ''}</span>
            )}
          </div>

          {/* Opção "Todas" */}
          <button
            onClick={selectAll}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-[10px] transition-colors cursor-pointer"
            style={{
              color: allSelected ? t.blue : t.textSec,
              background: allSelected ? t.blueDim : 'transparent',
              border: 'none',
              fontFamily: 'inherit',
            }}
          >
            {allSelected
              ? <CheckSquare size={13} style={{ color: t.blue }} />
              : <Square size={13} style={{ color: t.muted }} />
            }
            <span className="flex-1 font-medium">Todas as unidades</span>
          </button>

          <div style={{ height: 1, background: t.border }} />

          {/* Lista de projetos com checkbox */}
          {projetos.map((p) => {
            const selected = isSelected(p.id)
            return (
              <button
                key={p.id}
                onClick={() => toggle(p.id)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-[10px] transition-colors cursor-pointer"
                style={{
                  color: selected ? t.blue : t.textSec,
                  background: 'transparent',
                  border: 'none',
                  fontFamily: 'inherit',
                }}
              >
                {selected
                  ? <CheckSquare size={13} style={{ color: t.blue }} />
                  : <Square size={13} style={{ color: t.muted }} />
                }
                <div className="flex-1">
                  <div>{p.nome}</div>
                  <div className="font-mono text-[8px] mt-px" style={{ color: t.mutedDim }}>{p.codigo}</div>
                </div>
              </button>
            )
          })}

          {/* Footer com ação rápida */}
          {!allSelected && (
            <div
              className="px-3 py-2 flex justify-end"
              style={{ borderTop: `1px solid ${t.border}` }}
            >
              <button
                onClick={selectAll}
                className="text-[9px] cursor-pointer transition-colors"
                style={{ color: t.muted, background: 'none', border: 'none', fontFamily: 'inherit' }}
              >
                Limpar filtro
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
