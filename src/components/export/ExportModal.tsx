'use client'
import { useState, useCallback, useEffect } from 'react'
import { Download, X, FileText, Check, Loader2 } from 'lucide-react'
import { useThemeStore } from '@/store/themeStore'
import { useEmpresaStore } from '@/store/empresaStore'

interface ExportModalProps {
  open: boolean
  onClose: () => void
}

const PAGE_OPTIONS = [
  { value: 'dashboard', label: 'Dashboard Executivo' },
  { value: 'caixa', label: 'Caixa Realizado' },
  { value: 'extrato', label: 'Extrato' },
  { value: 'cp-cr', label: 'A Pagar/Receber' },
  { value: 'fluxo', label: 'Fluxo de Caixa' },
  { value: 'conciliacao', label: 'Conciliação' },
] as const

type ExportStatus = 'idle' | 'exporting' | 'success'

export function ExportModal({ open, onClose }: ExportModalProps) {
  const t = useThemeStore((s) => s.tokens)
  const activeEmpresa = useEmpresaStore((s) => s.getActive())

  const [page, setPage] = useState<string>('caixa')
  const [includeCharts, setIncludeCharts] = useState(true)
  const [includeTables, setIncludeTables] = useState(true)
  const [includeIA, setIncludeIA] = useState(false)
  const [status, setStatus] = useState<ExportStatus>('idle')

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setStatus('idle')
    }
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  const handleExport = useCallback(() => {
    setStatus('exporting')
    // Simulated export — in production, use html2canvas + jsPDF or server-side Puppeteer
    setTimeout(() => {
      setStatus('success')
      setTimeout(() => {
        onClose()
      }, 1200)
    }, 2000)
  }, [onClose])

  if (!open) return null

  const labelStyle = {
    color: t.muted,
    fontSize: 9,
    textTransform: 'uppercase' as const,
    letterSpacing: 1.2,
    fontFamily: "'DM Mono', monospace",
  }

  const fieldStyle = {
    background: t.surface,
    border: `1px solid ${t.border}`,
    borderRadius: 8,
    padding: '8px 12px',
    color: t.text,
    fontSize: 12,
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
    width: '100%' as const,
    outline: 'none',
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="w-full max-w-[420px] mx-4 rounded-xl overflow-hidden"
        style={{
          background: t.surfaceElevated,
          border: `1px solid ${t.border}`,
          boxShadow: t.tooltipShadow,
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3.5"
          style={{ borderBottom: `1px solid ${t.border}` }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="flex items-center justify-center w-7 h-7 rounded-lg"
              style={{ background: t.blueDim }}
            >
              <Download size={13} style={{ color: t.blue }} />
            </div>
            <span className="text-[13px] font-semibold" style={{ color: t.text }}>
              Exportar Relatório
            </span>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-7 h-7 rounded-lg transition-all"
            style={{ color: t.muted }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = t.surface
              e.currentTarget.style.color = t.text
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = t.muted
            }}
            aria-label="Fechar"
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 flex flex-col gap-3.5">
          {/* Página */}
          <div className="flex flex-col gap-1.5">
            <label style={labelStyle}>Página</label>
            <select
              value={page}
              onChange={(e) => setPage(e.target.value)}
              style={{
                ...fieldStyle,
                appearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='${encodeURIComponent(t.muted)}' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 12px center',
                paddingRight: 32,
                cursor: 'pointer',
              }}
            >
              {PAGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Período */}
          <div className="flex flex-col gap-1.5">
            <label style={labelStyle}>Período</label>
            <div
              className="flex items-center gap-2"
              style={{ ...fieldStyle, color: t.textSec }}
            >
              <FileText size={12} style={{ color: t.muted, flexShrink: 0 }} />
              <span>01/10/2025 → 31/03/2026</span>
            </div>
          </div>

          {/* Empresa */}
          <div className="flex flex-col gap-1.5">
            <label style={labelStyle}>Empresa</label>
            <div
              className="flex items-center gap-2"
              style={{ ...fieldStyle, color: t.textSec }}
            >
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: activeEmpresa.cor }}
              />
              <span>{activeEmpresa.nome}</span>
            </div>
          </div>

          {/* Checkboxes */}
          <div className="flex flex-col gap-2 mt-1">
            <CheckboxItem
              checked={includeCharts}
              onChange={setIncludeCharts}
              label="Incluir gráficos"
              t={t}
            />
            <CheckboxItem
              checked={includeTables}
              onChange={setIncludeTables}
              label="Incluir tabelas detalhadas"
              t={t}
            />
            <CheckboxItem
              checked={includeIA}
              onChange={setIncludeIA}
              label="Incluir análise IA"
              t={t}
            />
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-2 px-5 py-3.5"
          style={{ borderTop: `1px solid ${t.border}` }}
        >
          <button
            onClick={onClose}
            disabled={status === 'exporting'}
            className="px-4 py-2 rounded-lg text-[11px] font-medium transition-all"
            style={{
              background: t.surface,
              border: `1px solid ${t.border}`,
              color: t.muted,
              cursor: status === 'exporting' ? 'not-allowed' : 'pointer',
              opacity: status === 'exporting' ? 0.5 : 1,
            }}
            onMouseEnter={(e) => {
              if (status !== 'exporting') {
                e.currentTarget.style.background = t.surfaceHover
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = t.surface
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleExport}
            disabled={status !== 'idle'}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-[11px] font-semibold transition-all"
            style={{
              background:
                status === 'success'
                  ? t.green
                  : status === 'exporting'
                    ? t.blueDim
                    : t.blue,
              color:
                status === 'success'
                  ? '#fff'
                  : status === 'exporting'
                    ? t.blue
                    : '#fff',
              cursor: status !== 'idle' ? 'not-allowed' : 'pointer',
              border: 'none',
            }}
          >
            {status === 'idle' && (
              <>
                <Download size={12} />
                Exportar PDF
              </>
            )}
            {status === 'exporting' && (
              <>
                <Loader2 size={12} className="animate-spin" />
                Gerando PDF...
              </>
            )}
            {status === 'success' && (
              <>
                <Check size={12} />
                Exportado!
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ---------- Internal checkbox component ---------- */

interface CheckboxItemProps {
  checked: boolean
  onChange: (val: boolean) => void
  label: string
  t: ReturnType<typeof useThemeStore.getState>['tokens']
}

function CheckboxItem({ checked, onChange, label, t }: CheckboxItemProps) {
  return (
    <label
      className="flex items-center gap-2.5 cursor-pointer select-none group"
      style={{ fontSize: 12, color: t.textSec }}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="flex items-center justify-center w-4 h-4 rounded transition-all flex-shrink-0"
        style={{
          background: checked ? t.blue : 'transparent',
          border: `1.5px solid ${checked ? t.blue : t.border}`,
        }}
      >
        {checked && <Check size={10} strokeWidth={3} style={{ color: '#fff' }} />}
      </button>
      <span>{label}</span>
    </label>
  )
}
