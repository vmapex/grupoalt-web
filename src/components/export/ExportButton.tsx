'use client'
import { Download } from 'lucide-react'
import { useThemeStore } from '@/store/themeStore'

interface ExportButtonProps {
  onClick: () => void
}

export function ExportButton({ onClick }: ExportButtonProps) {
  const t = useThemeStore((s) => s.tokens)

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all"
      style={{
        background: t.surface,
        border: `1px solid ${t.border}`,
        color: t.muted,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = `${t.blue}55`
        e.currentTarget.style.color = t.blue
        e.currentTarget.style.background = t.blueDim
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = t.border
        e.currentTarget.style.color = t.muted
        e.currentTarget.style.background = t.surface
      }}
      aria-label="Exportar relatório em PDF"
    >
      <Download size={12} />
      <span>PDF</span>
    </button>
  )
}
