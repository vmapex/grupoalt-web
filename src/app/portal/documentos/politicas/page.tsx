'use client'
import { ScrollText } from 'lucide-react'

export default function PoliticasPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-[#F1F5F9] mb-6">Políticas</h1>
      <div className="bg-white/[0.034] border border-white/[0.07] rounded-lg p-8 text-center">
        <ScrollText size={40} className="text-[#64748B] mx-auto mb-4" />
        <p className="text-[#64748B]">Documentação de políticas em desenvolvimento</p>
      </div>
    </div>
  )
}
