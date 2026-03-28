'use client'

import { useAuthStore } from '@/store/authStore'
import { Building2, Users, Tag } from 'lucide-react'

export default function GrupoPage() {
  const { grupoAtivo, empresas } = useAuthStore()

  return (
    <div>
      <h1 className="text-xl font-semibold text-[#F1F5F9] mb-6">
        {grupoAtivo?.nome || 'Grupo Empresarial'}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white/[0.034] border border-white/[0.07] rounded-lg p-5">
          <div className="flex items-center gap-3 mb-2">
            <Building2 size={20} className="text-[#38BDF8]" />
            <span className="text-sm text-[#64748B]">Empresas Ativas</span>
          </div>
          <p className="text-2xl font-bold text-[#F1F5F9] font-mono">
            {empresas.length}
          </p>
        </div>

        <div className="bg-white/[0.034] border border-white/[0.07] rounded-lg p-5">
          <div className="flex items-center gap-3 mb-2">
            <Users size={20} className="text-[#34D399]" />
            <span className="text-sm text-[#64748B]">Usuários</span>
          </div>
          <p className="text-2xl font-bold text-[#F1F5F9] font-mono">—</p>
        </div>

        <div className="bg-white/[0.034] border border-white/[0.07] rounded-lg p-5">
          <div className="flex items-center gap-3 mb-2">
            <Tag size={20} className="text-[#FBBF24]" />
            <span className="text-sm text-[#64748B]">Segmentos</span>
          </div>
          <p className="text-2xl font-bold text-[#F1F5F9] font-mono">—</p>
        </div>
      </div>

      <div className="bg-white/[0.034] border border-white/[0.07] rounded-lg p-6">
        <h2 className="text-sm font-medium text-[#F1F5F9] mb-4">Empresas do Grupo</h2>
        <div className="space-y-2">
          {empresas.map(emp => (
            <div key={emp.id} className="flex items-center justify-between py-2 px-3 rounded bg-white/[0.02] border border-white/[0.04]">
              <div>
                <span className="text-sm text-[#F1F5F9]">{emp.nome}</span>
                {emp.cnpj && <span className="text-xs text-[#64748B] ml-3 font-mono">{emp.cnpj}</span>}
              </div>
              {emp.slug && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#38BDF8]/10 text-[#38BDF8] font-mono">
                  {emp.slug}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
