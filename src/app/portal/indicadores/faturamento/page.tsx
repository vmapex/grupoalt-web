'use client'
import { BarChart3 } from 'lucide-react'

export default function FaturamentoPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-[#F1F5F9] mb-6">Indicadores de Faturamento</h1>
      <div className="bg-white/[0.034] border border-white/[0.07] rounded-lg p-8 text-center">
        <BarChart3 size={40} className="text-[#64748B] mx-auto mb-4" />
        <p className="text-[#64748B]">Indicadores de Faturamento — em desenvolvimento</p>
      </div>
    </div>
  )
}
