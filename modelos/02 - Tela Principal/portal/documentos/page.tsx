'use client'
import { FileText, ScrollText, CalendarCheck } from 'lucide-react'
import Link from 'next/link'

const categories = [
  { name: 'Processos', href: '/portal/documentos/processos', icon: FileText, description: 'Documentação de processos organizacionais' },
  { name: 'Políticas', href: '/portal/documentos/politicas', icon: ScrollText, description: 'Políticas internas e diretrizes' },
  { name: 'Planejamentos', href: '/portal/documentos/planejamentos', icon: CalendarCheck, description: 'Planejamentos organizacionais e estratégicos' },
]

export default function DocumentosPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-[#F1F5F9] mb-6">Documentação Institucional</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((cat) => {
          const Icon = cat.icon
          return (
            <Link key={cat.name} href={cat.href}>
              <div className="bg-white/[0.034] border border-white/[0.07] rounded-lg p-6 text-center hover:border-white/[0.14] transition-colors">
                <Icon size={32} className="text-[#64748B] mx-auto mb-3" />
                <p className="text-[#F1F5F9] font-medium">{cat.name}</p>
                <p className="text-[#64748B] text-sm mt-1">{cat.description}</p>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
