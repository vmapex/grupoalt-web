'use client'
/* Barra de paginação das tabelas grandes (par do usePagedRows).
   fmtInt em leitura — regra da casa. */
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { useThemeStore } from '@/store/themeStore'
import { fmtInt } from '@/lib/formatters'

interface TablePagerProps {
  page: number
  totalPages: number
  total: number
  pageSize: number
  setPage: (p: number) => void
}

export function TablePager({ page, totalPages, total, pageSize, setPage }: TablePagerProps) {
  const t = useThemeStore((s) => s.tokens)
  if (total <= pageSize) return null

  const ini = page * pageSize + 1
  const fim = Math.min((page + 1) * pageSize, total)
  const btnStyle = (disabled: boolean) =>
    ({
      border: `1px solid ${t.border}`,
      background: t.surface,
      color: disabled ? t.mutedDim : t.text,
      cursor: disabled ? 'default' : 'pointer',
    }) as const

  return (
    <div
      className="flex items-center justify-between gap-3 px-4 py-2 shrink-0"
      style={{ borderTop: `1px solid ${t.border}`, background: `${t.bg}88` }}
    >
      <span className="text-[10px] font-mono" style={{ color: t.muted }}>
        {fmtInt(ini)}–{fmtInt(fim)} de {fmtInt(total)}
      </span>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => setPage(0)}
          disabled={page === 0}
          aria-label="Primeira página"
          className="rounded-md p-1"
          style={btnStyle(page === 0)}
        >
          <ChevronsLeft size={13} />
        </button>
        <button
          onClick={() => setPage(page - 1)}
          disabled={page === 0}
          aria-label="Página anterior"
          className="rounded-md p-1"
          style={btnStyle(page === 0)}
        >
          <ChevronLeft size={13} />
        </button>
        <span className="text-[10px] font-mono px-1" style={{ color: t.textSec }}>
          {fmtInt(page + 1)} / {fmtInt(totalPages)}
        </span>
        <button
          onClick={() => setPage(page + 1)}
          disabled={page >= totalPages - 1}
          aria-label="Próxima página"
          className="rounded-md p-1"
          style={btnStyle(page >= totalPages - 1)}
        >
          <ChevronRight size={13} />
        </button>
        <button
          onClick={() => setPage(totalPages - 1)}
          disabled={page >= totalPages - 1}
          aria-label="Última página"
          className="rounded-md p-1"
          style={btnStyle(page >= totalPages - 1)}
        >
          <ChevronsRight size={13} />
        </button>
      </div>
    </div>
  )
}
