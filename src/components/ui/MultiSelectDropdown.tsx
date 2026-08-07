'use client'
/* ═══════════════════════════════════════════════════════════════
   Filtro multi-seleção com checkboxes (2026-08-07).

   Nasceu do filtro de categoria do CP/CR: `<select>` nativo não serve
   para multi-seleção (o `multiple` exige Ctrl+clique e não mostra o que
   está marcado). Segue o padrão visual do UnidadeDropdown — botão com
   contador, painel com checkboxes, "Todas", "Limpar" e a LISTA como
   única área rolável (teto de altura, senão o painel vaza da viewport).
   ═══════════════════════════════════════════════════════════════ */
import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Square, CheckSquare } from 'lucide-react'
import { useThemeStore } from '@/store/themeStore'

export interface MultiSelectOption {
  value: string
  label: string
  /** Marca opção fora do recorte atual (selecionada mas sem linhas). */
  ausente?: boolean
}

interface MultiSelectDropdownProps {
  options: MultiSelectOption[]
  selected: Set<string>
  onToggle: (value: string) => void
  onClear: () => void
  /** Texto quando nada está selecionado. Ex.: "Todas as categorias". */
  allLabel: string
  /** Sufixo do contador. Ex.: "categorias" → "3 categorias". */
  countLabel: string
  ariaLabel?: string
}

export function MultiSelectDropdown({
  options,
  selected,
  onToggle,
  onClear,
  allLabel,
  countLabel,
  ariaLabel,
}: MultiSelectDropdownProps) {
  const t = useThemeStore((s) => s.tokens)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const count = selected.size
  const ativo = count > 0
  const label =
    count === 0
      ? allLabel
      : count === 1
        ? options.find((o) => o.value === [...selected][0])?.label || `1 ${countLabel}`
        : `${count} ${countLabel}`

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-label={ariaLabel}
        aria-expanded={open}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] cursor-pointer transition-all max-w-[210px]"
        style={{
          background: ativo ? t.blueDim : 'transparent',
          color: ativo ? t.blue : t.muted,
          border: `1px solid ${ativo ? `${t.blue}44` : t.border}`,
          fontWeight: ativo ? 600 : 400,
          fontFamily: 'inherit',
        }}
      >
        <span className="truncate">{label}</span>
        <ChevronDown
          size={11}
          className="shrink-0 transition-transform"
          style={{ transform: open ? 'rotate(180deg)' : 'none' }}
        />
      </button>

      {open && (
        <div
          className="absolute right-0 top-[calc(100%+4px)] rounded-lg overflow-hidden z-50 min-w-[240px] flex flex-col"
          style={{
            background: t.surfaceElevated,
            border: `1px solid ${t.borderHover}`,
            boxShadow: t.tooltipShadow,
            maxHeight: 'min(60vh, 420px)',
          }}
        >
          <button
            onClick={onClear}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-[10px] cursor-pointer shrink-0"
            style={{
              color: !ativo ? t.blue : t.textSec,
              background: !ativo ? t.blueDim : 'transparent',
              border: 'none',
              fontFamily: 'inherit',
            }}
          >
            {!ativo
              ? <CheckSquare size={13} style={{ color: t.blue }} />
              : <Square size={13} style={{ color: t.muted }} />}
            <span className="flex-1 font-medium">{allLabel}</span>
          </button>

          <div className="shrink-0" style={{ height: 1, background: t.border }} />

          <div className="flex-1 min-h-0 overflow-y-auto" data-testid="multiselect-lista">
            {options.length === 0 && (
              <div className="px-3 py-4 text-center text-[10px]" style={{ color: t.muted }}>
                Nada para filtrar no recorte atual
              </div>
            )}
            {options.map((o) => {
              const on = selected.has(o.value)
              return (
                <button
                  key={o.value}
                  onClick={() => onToggle(o.value)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-[10px] cursor-pointer"
                  style={{
                    color: on ? t.blue : t.textSec,
                    background: 'transparent',
                    border: 'none',
                    fontFamily: 'inherit',
                  }}
                >
                  {on
                    ? <CheckSquare size={13} style={{ color: t.blue }} className="shrink-0" />
                    : <Square size={13} style={{ color: t.muted }} className="shrink-0" />}
                  <span className="flex-1 truncate" title={o.label}>{o.label}</span>
                  {o.ausente && (
                    <span className="text-[8px] shrink-0" style={{ color: t.mutedDim }}>
                      sem lançamentos
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {ativo && (
            <div
              className="px-3 py-2 flex justify-end shrink-0"
              style={{ borderTop: `1px solid ${t.border}` }}
            >
              <button
                onClick={onClear}
                className="text-[9px] cursor-pointer"
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
