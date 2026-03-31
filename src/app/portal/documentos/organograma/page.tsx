'use client'
import { Network } from 'lucide-react'

export default function OrganogramaPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-white tracking-tight mb-1">Organograma</h1>
      <p className="text-sm text-zinc-400 mb-8">Estrutura organizacional do grupo</p>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
        <Network size={40} className="text-zinc-600 mx-auto mb-4" />
        <p className="text-zinc-500">Módulo em desenvolvimento</p>
      </div>
    </div>
  )
}
