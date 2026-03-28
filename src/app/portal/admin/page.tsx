'use client'
import { Shield } from 'lucide-react'
import Link from 'next/link'

export default function AdminPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-[#F1F5F9] mb-6">Administração</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link href="/portal/admin/permissoes">
          <div className="bg-white/[0.034] border border-white/[0.07] rounded-lg p-6 text-center hover:border-white/[0.14] transition-colors">
            <Shield size={32} className="text-[#64748B] mx-auto mb-3" />
            <p className="text-[#F1F5F9] font-medium">Permissões</p>
            <p className="text-[#64748B] text-sm mt-1">Gestão de acessos e permissões</p>
          </div>
        </Link>
      </div>
    </div>
  )
}
