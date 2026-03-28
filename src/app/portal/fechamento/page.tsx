'use client'
import { CheckSquare } from 'lucide-react'

export default function FechamentoPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-[#F1F5F9] mb-6">Motor de Fechamento</h1>
      <div className="bg-white/[0.034] border border-white/[0.07] rounded-lg p-8 text-center">
        <CheckSquare size={40} className="text-[#64748B] mx-auto mb-4" />
        <p className="text-[#64748B]">Módulo em desenvolvimento paralelo</p>
      </div>
    </div>
  )
}
