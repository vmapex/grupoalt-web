'use client'
import { Shield } from 'lucide-react'

export default function PermissoesPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-[#F1F5F9] mb-6">Gestão de Permissões</h1>
      <div className="bg-white/[0.034] border border-white/[0.07] rounded-lg p-8 text-center">
        <Shield size={40} className="text-[#64748B] mx-auto mb-4" />
        <p className="text-[#64748B]">Painel de permissões em desenvolvimento</p>
      </div>
    </div>
  )
}
