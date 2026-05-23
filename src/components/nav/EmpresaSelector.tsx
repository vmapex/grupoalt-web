'use client'

/* ═══════════════════════════════════════════════════════════════
   EmpresaSelector — dropdown clicavel no topo do Sidebar do Portal
   para trocar a empresa ativa (2026-05-23).

   Resolve o bug pre-existente onde o botao "Grupo ALT" no topo
   do Sidebar mostrava chevron mas nao tinha onClick. Pra trocar
   empresa, o usuario precisava usar a seccao "EMPRESAS" mais
   embaixo do Sidebar — que sera removida no mesmo PR pra eliminar
   a duplicacao.

   Comportamento:
   - Click no botao -> abre/fecha dropdown.
   - Click numa empresa -> useEmpresaStore.setActive(id) + fecha.
   - Click fora ou ESC -> fecha.

   Acessibilidade:
   - aria-haspopup, aria-expanded, role="menu", role="menuitem".

   Visual: mantem o look-and-feel do design system (gold accent,
   border-rounded, dot colorido por empresa).
   ═══════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from 'react'
import { Building2, ChevronDown, Check } from 'lucide-react'
import { useEmpresaStore } from '@/store/empresaStore'
import { useThemeStore } from '@/store/themeStore'


export function EmpresaSelector() {
  const empresas = useEmpresaStore((s) => s.empresas)
  const activeId = useEmpresaStore((s) => s.activeId)
  const setActive = useEmpresaStore((s) => s.setActive)
  const t = useThemeStore((s) => s.tokens)

  const [open, setOpen] = useState(false)
  const [hover, setHover] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  // Close on click outside
  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  // Close on ESC
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const active = empresas.find((e) => e.id === activeId) || null
  const label = active?.nome ?? (empresas.length === 0 ? 'Sem empresas' : 'Selecione...')

  function handleSelect(id: string) {
    setActive(id)
    setOpen(false)
  }

  const disabled = empresas.length === 0

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setOpen((v) => !v)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Selecionar empresa ativa"
        className="flex gap-2 transition-all text-[13px] font-medium border rounded-xl py-2 px-3 items-center"
        style={{
          background: open || hover ? t.surfaceHover : t.surface,
          borderColor: open || hover ? t.borderGold : t.border,
          color: t.text,
          fontFamily: 'var(--font-body)',
          opacity: disabled ? 0.6 : 1,
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        <Building2 className="w-4 h-4" style={{ color: t.gold }} />
        <span
          className="truncate max-w-[160px]"
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 400,
            letterSpacing: '-0.01em',
          }}
          title={label}
        >
          {label}
        </span>
        <ChevronDown
          className="w-3.5 h-3.5 transition-transform"
          style={{
            color: t.muted,
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>

      {open && empresas.length > 0 && (
        <div
          role="menu"
          aria-label="Empresas disponíveis"
          className="absolute left-0 mt-2 rounded-xl overflow-hidden z-50"
          style={{
            minWidth: 260,
            maxHeight: 360,
            overflowY: 'auto',
            background: t.surfaceElevated,
            border: `1px solid ${t.border}`,
            boxShadow: '0 10px 32px rgba(0,0,0,0.45), 0 2px 6px rgba(0,0,0,0.25)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
        >
          <div
            className="px-3 py-2"
            style={{
              borderBottom: `1px solid ${t.border}`,
              color: t.gold,
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
            }}
          >
            Empresas
          </div>

          {empresas.map((emp) => {
            const isActive = emp.id === activeId
            return (
              <button
                type="button"
                key={emp.id}
                role="menuitem"
                onClick={() => handleSelect(emp.id)}
                className="flex items-center gap-3 w-full px-3 py-2.5 text-left transition-colors"
                style={{
                  background: isActive ? t.surfaceHover : 'transparent',
                  color: t.text,
                  fontSize: 13,
                  borderTop: 'none',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = t.surfaceHover
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'transparent'
                }}
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{
                    background: emp.cor,
                    boxShadow: `0 0 8px ${emp.cor}`,
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="truncate" style={{ fontWeight: isActive ? 600 : 500 }}>
                    {emp.nome}
                  </div>
                  {emp.cnpj && (
                    <div
                      className="truncate text-[10px] mt-0.5"
                      style={{
                        color: t.muted,
                        fontFamily: 'var(--font-mono)',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {emp.cnpj}
                    </div>
                  )}
                </div>
                {isActive && (
                  <Check
                    size={14}
                    style={{ color: t.gold, flexShrink: 0 }}
                    aria-label="Ativa"
                  />
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
