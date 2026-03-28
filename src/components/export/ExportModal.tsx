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
  const isDark = useThemeStore((s) => s.mode === 'dark')
  const activeEmpresa = useEmpresaStore((s) => s.getActive())

  const [page, setPage] = useState<string>('caixa')
  const [includeCharts, setIncludeCharts] = useState(true)
  const [includeTables, setIncludeTables] = useState(true)
  const [includeIA, setIncludeIA] = useState(false)
  const [status, setStatus] = useState<ExportStatus>('idle')

  // Auto-detect current page on open
  useEffect(() => {
    if (open) {
      setStatus('idle')
      const path = window.location.pathname
      if (path === '/portal') setPage('dashboard')
      else {
        const seg = path.replace('/portal/', '')
        const match = PAGE_OPTIONS.find(p => p.value === seg)
        if (match) setPage(match.value)
      }
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

  const handleExport = useCallback(async () => {
    setStatus('exporting')
    try {
      const [html2canvasModule, jsPDFModule] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ])
      const html2canvas = html2canvasModule.default
      const { jsPDF } = jsPDFModule

      const mainEl = document.querySelector('main')
      if (!mainEl) throw new Error('Main element not found')

      // Save original styles
      const origH = mainEl.style.height
      const origOverflow = mainEl.style.overflow
      const origMaxH = mainEl.style.maxHeight

      // Expand to full scroll height for complete capture
      const scrollH = mainEl.scrollHeight
      const scrollW = mainEl.scrollWidth
      mainEl.style.height = `${scrollH}px`
      mainEl.style.maxHeight = 'none'
      mainEl.style.overflow = 'visible'

      // Use theme-aware background
      const bgColor = isDark ? '#05091A' : '#F4F6F8'

      const canvas = await html2canvas(mainEl as HTMLElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: bgColor,
        logging: false,
        width: scrollW,
        height: scrollH,
        windowWidth: scrollW,
        windowHeight: scrollH,
        scrollX: 0,
        scrollY: 0,
      })

      // Restore styles
      mainEl.style.height = origH
      mainEl.style.overflow = origOverflow
      mainEl.style.maxHeight = origMaxH

      const imgData = canvas.toDataURL('image/png')
      const pageLabel = PAGE_OPTIONS.find(p => p.value === page)?.label || 'Relatório'
      const now = new Date()
      const timestamp = `Gerado em ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} — ALT MAX Portal BI`

      // PDF colors based on theme
      const pdfBgR = isDark ? 5 : 244
      const pdfBgG = isDark ? 9 : 246
      const pdfBgB = isDark ? 26 : 248
      const pdfTextR = isDark ? 241 : 15
      const pdfTextG = isDark ? 245 : 23
      const pdfTextB = isDark ? 249 : 42

      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const pdfW = pdf.internal.pageSize.getWidth()
      const pdfH = pdf.internal.pageSize.getHeight()
      const headerH = 20
      const footerH = 8
      const margin = 8
      const contentW = pdfW - margin * 2
      const contentAreaH = pdfH - headerH - footerH
      const totalImgH = (canvas.height / canvas.width) * contentW
      const totalPages = Math.max(1, Math.ceil(totalImgH / contentAreaH))

      for (let pg = 0; pg < totalPages; pg++) {
        if (pg > 0) pdf.addPage()

        // Background
        pdf.setFillColor(pdfBgR, pdfBgG, pdfBgB)
        pdf.rect(0, 0, pdfW, pdfH, 'F')

        // Clip: only show the slice for this page
        const srcY = (pg * contentAreaH / totalImgH) * canvas.height
        const srcH = Math.min((contentAreaH / totalImgH) * canvas.height, canvas.height - srcY)
        const sliceCanvas = document.createElement('canvas')
        sliceCanvas.width = canvas.width
        sliceCanvas.height = srcH
        const ctx = sliceCanvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH)
        }
        const sliceImg = sliceCanvas.toDataURL('image/png')
        const sliceH = (srcH / canvas.width) * contentW

        pdf.addImage(sliceImg, 'PNG', margin, headerH, contentW, sliceH)

        // Header
        pdf.setFillColor(pdfBgR, pdfBgG, pdfBgB)
        pdf.rect(0, 0, pdfW, headerH, 'F')
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(11)
        pdf.setTextColor(pdfTextR, pdfTextG, pdfTextB)
        pdf.text(`${activeEmpresa.nome} — ${pageLabel}`, margin, 9)
        pdf.setFontSize(7)
        pdf.setFont('helvetica', 'normal')
        pdf.setTextColor(100, 116, 139)
        pdf.text('Período: 01/10/2025 → 31/03/2026', margin, 14)

        // Separator line
        pdf.setDrawColor(100, 116, 139)
        pdf.setLineWidth(0.2)
        pdf.line(margin, headerH - 1, pdfW - margin, headerH - 1)

        // Footer
        pdf.setFillColor(pdfBgR, pdfBgG, pdfBgB)
        pdf.rect(0, pdfH - footerH, pdfW, footerH, 'F')
        pdf.setFontSize(6)
        pdf.setTextColor(100, 116, 139)
        pdf.text(timestamp, margin, pdfH - 3)
        pdf.text(`Página ${pg + 1} de ${totalPages}`, pdfW - margin - 20, pdfH - 3)
      }

      pdf.save(`altmax-${pageLabel.toLowerCase().replace(/\s+/g, '-')}-${now.toISOString().slice(0, 10)}.pdf`)

      setStatus('success')
      setTimeout(() => onClose(), 1500)
    } catch (err) {
      console.error('Export error:', err)
      setStatus('idle')
    }
  }, [onClose, page, activeEmpresa.nome, isDark])

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
            <label style={labelStyle}>Página atual</label>
            <div
              className="flex items-center gap-2"
              style={{ ...fieldStyle, color: t.textSec }}
            >
              <FileText size={12} style={{ color: t.muted, flexShrink: 0 }} />
              <span>{PAGE_OPTIONS.find(p => p.value === page)?.label || 'Página atual'}</span>
              <span className="ml-auto text-[8px] font-mono" style={{ color: t.mutedDim }}>
                Navege até a página desejada antes de exportar
              </span>
            </div>
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
