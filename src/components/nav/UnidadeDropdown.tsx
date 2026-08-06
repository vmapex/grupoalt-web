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

  const hasProjetos = projetos.length > 0
  const allSelected = isAllSelected()
  const count = selectedIds.length

  // Label dinâmico
  let label = 'Todas unidades'
  if (!hasProjetos && !loading) {
    label = 'Sem unidades'
  } else if (count === 1) {
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
          className="absolute right-0 top-[calc(100%+4px)] rounded-lg overflow-hidden z-50 min-w-[220px] flex flex-col"
          style={{
            background: t.surfaceElevated,
            border: `1px solid ${t.borderHover}`,
            boxShadow: t.tooltipShadow,
            // Sem teto de altura o dropdown crescia com a lista e vazava
            // pra fora da viewport (2026-08-07: 17 unidades, as últimas
            // ficavam inalcançáveis). Só a LISTA rola — cabeçalho,
            // "Todas as unidades" e "Limpar filtro" ficam sempre visíveis.
            maxHeight: 'min(72vh, 560px)',
          }}
        >
          <div
            className="px-3 py-2 text-[8px] uppercase tracking-wider flex items-center justify-between shrink-0"
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
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-[10px] transition-colors cursor-pointer shrink-0"
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

          <div className="shrink-0" style={{ height: 1, background: t.border }} />

          {/* Estado vazio */}
          {!hasProjetos && !loading && (
            <div className="px-3 py-4 text-center" style={{ color: t.muted }}>
              <div className="text-[10px] mb-1">Nenhuma unidade cadastrada</div>
              <div className="text-[8px]" style={{ color: t.mutedDim }}>
                Cadastre projetos na Omie ou sincronize manualmente
              </div>
            </div>
          )}

          {loading && (
            <div className="px-3 py-4 text-center text-[10px]" style={{ color: t.muted }}>
              Carregando...
            </div>
          )}

          {/* Lista de projetos com checkbox — única área rolável */}
          <div className="flex-1 min-h-0 overflow-y-auto" data-testid="unidade-lista">
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
          </div>

          {/* Footer com ação rápida */}
          {!allSelected && (
            <div
              className="px-3 py-2 flex justify-end shrink-0"
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
