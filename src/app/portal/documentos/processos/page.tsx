'use client'
import { FileText } from 'lucide-react'

export default function ProcessosPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-[#F1F5F9] mb-6">Processos</h1>
      <div className="bg-white/[0.034] border border-white/[0.07] rounded-lg p-8 text-center">
        <FileText size={40} className="text-[#64748B] mx-auto mb-4" />
        <p className="text-[#64748B]">Documentação de processos em desenvolvimento</p>
      </div>
    </div>
  )
}
