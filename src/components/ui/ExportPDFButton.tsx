'use client'

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/lib/api'
import { useAuthStore } from '@/store/authStore'

/**
 * Step 09: catalogo fechado de relatorios PDF que o frontend pode disparar.
 * Mantemos os endpoints como constantes internas — o caller escolhe o
 * `report` mas nao monta a URL livremente.
 */
const PDF_REPORTS = {
  extrato: {
    endpoint: (empresaId: number) => `/export/empresas/${empresaId}/extrato/pdf`,
    defaultFilename: 'extrato.pdf',
    defaultLabel: 'PDF Extrato',
  },
  cp: {
    endpoint: (empresaId: number) => `/export/empresas/${empresaId}/cp/pdf`,
    defaultFilename: 'contas_pagar.pdf',
    defaultLabel: 'PDF CP',
  },
  cr: {
    endpoint: (empresaId: number) => `/export/empresas/${empresaId}/cr/pdf`,
    defaultFilename: 'contas_receber.pdf',
    defaultLabel: 'PDF CR',
  },
} as const

export type PDFReport = keyof typeof PDF_REPORTS

interface ExportPDFButtonProps {
  empresaId: number | string | null
  report: PDFReport
  filename?: string
  params?: Record<string, string>
  label?: string
  /**
   * Contrato de permissao para exportar. Quando omitido, exige
   * `is_admin === true`. O backend continua validando — esse check e UX.
   */
  permissao?: { modulo: string; acao: string }
}

function normalizeEmpresaId(raw: number | string | null): number | null {
  if (raw === null || raw === undefined || raw === '') return null
  const id = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isFinite(id) || !Number.isInteger(id) || id <= 0) return null
  return id
}

export function ExportPDFButton({
  empresaId,
  report,
  filename,
  params,
  label,
  permissao,
}: ExportPDFButtonProps) {
  const [loading, setLoading] = useState(false)
  const user = useAuthStore((s) => s.user)
  const hasPermissao = useAuthStore((s) => s.hasPermissao)

  const empresaIdNum = normalizeEmpresaId(empresaId)
  const cfg = PDF_REPORTS[report]
  const isAdmin = !!user?.is_admin
  const allowed = permissao
    ? hasPermissao(permissao.modulo, permissao.acao, empresaIdNum ?? undefined)
    : isAdmin

  const finalLabel = label ?? cfg.defaultLabel
  const finalFilename = filename ?? cfg.defaultFilename
  const disabled = loading || !empresaIdNum || !allowed

  const title = !allowed
    ? 'Voce nao tem permissao para exportar este relatorio'
    : !empresaIdNum
      ? 'Selecione uma empresa para exportar'
      : 'Exportar relatorio em PDF'

  const handleExport = async () => {
    if (!empresaIdNum || !allowed) return
    setLoading(true)
    try {
      const url = cfg.endpoint(empresaIdNum)
      const response = await api.get(url, {
        params,
        responseType: 'blob',
      })
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = finalFilename
      link.click()
      URL.revokeObjectURL(link.href)
    } catch (err) {
      // 403 do backend significa que o frontend e o backend divergiram na
      // matriz de permissoes — mostre mensagem especifica.
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 403) {
        toast.error('Voce nao tem permissao para exportar este relatorio.')
      } else {
        // eslint-disable-next-line no-console
        console.error('Erro ao exportar PDF:', err)
        toast.error('Erro ao exportar PDF. Tente novamente.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={disabled}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        color: 'var(--muted)',
      }}
      title={title}
    >
      {loading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
      {finalLabel}
    </button>
  )
}
