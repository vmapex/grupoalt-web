'use client'
import { useParams } from 'next/navigation'
import { FileText } from 'lucide-react'

export default function DocumentoPage() {
  const params = useParams()
  const id = params.id as string

  return (
    <div>
      <h1 className="text-xl font-semibold text-[#F1F5F9] mb-6">Documento #{id}</h1>
      <div className="bg-white/[0.034] border border-white/[0.07] rounded-lg p-8 text-center">
        <FileText size={40} className="text-[#64748B] mx-auto mb-4" />
        <p className="text-[#64748B]">Carregando documento...</p>
      </div>
    </div>
  )
}
