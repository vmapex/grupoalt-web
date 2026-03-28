'use client'
import { BarChart3 } from 'lucide-react'
import Link from 'next/link'

const subModules = [
  { name: 'Financeiro', href: '/portal/indicadores/financeiro' },
  { name: 'Contábil', href: '/portal/indicadores/contabil' },
  { name: 'Faturamento', href: '/portal/indicadores/faturamento' },
  { name: 'Custos', href: '/portal/indicadores/custos' },
  { name: 'Controladoria', href: '/portal/indicadores/controladoria' },
]

export default function IndicadoresPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-[#F1F5F9] mb-6">Indicadores de Gestão</h1>
      <div className="bg-white/[0.034] border border-white/[0.07] rounded-lg p-8 text-center mb-8">
        <BarChart3 size={40} className="text-[#64748B] mx-auto mb-4" />
        <p className="text-[#64748B]">Módulo em desenvolvimento paralelo</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {subModules.map((mod) => (
          <Link key={mod.name} href={mod.href}>
            <div className="bg-white/[0.034] border border-white/[0.07] rounded-lg p-6 text-center hover:border-white/[0.14] transition-colors">
              <BarChart3 size={24} className="text-[#64748B] mx-auto mb-3" />
              <p className="text-[#F1F5F9] font-medium">{mod.name}</p>
              <p className="text-[#64748B] text-sm mt-1">Em breve</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
