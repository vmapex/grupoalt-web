'use client'

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import api from '@/lib/api'

interface ExportPDFButtonProps {
  empresaId: number | null
  endpoint: string
  filename?: string
  params?: Record<string, string>
  label?: string
}

export function ExportPDFButton({
  empresaId,
  endpoint,
  filename = 'relatorio.pdf',
  params,
  label = 'PDF',
}: ExportPDFButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleExport = async () => {
    if (!empresaId) return
    setLoading(true)
    try {
      const url = endpoint.replace('{empresa_id}', String(empresaId))
      const response = await api.get(url, {
        params,
        responseType: 'blob',
      })
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = filename
      link.click()
      URL.revokeObjectURL(link.href)
    } catch (err) {
      console.error('Erro ao exportar PDF:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={loading || !empresaId}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all disabled:opacity-40"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        color: 'var(--muted)',
      }}
      title="Exportar relatório em PDF"
    >
      {loading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
      {label}
    </button>
  )
}
