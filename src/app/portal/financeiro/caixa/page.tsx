'use client'
import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'

const PageCaixa = dynamic(() => import('./_content'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64 gap-2 opacity-50">
      <Loader2 size={18} className="animate-spin" />
      <span className="text-xs">Carregando caixa...</span>
    </div>
  ),
})

export default function CaixaPage() {
  return <PageCaixa />
}
