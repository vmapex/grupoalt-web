'use client'
import { TrendingUp } from 'lucide-react'

export default function OperacoesPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-white tracking-tight mb-1">Indicadores de Operações</h1>
      <p className="text-sm text-zinc-400 mb-8">Acompanhamento operacional do grupo</p>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
        <TrendingUp size={40} className="text-zinc-600 mx-auto mb-4" />
        <p className="text-zinc-500">Módulo em desenvolvimento</p>
      </div>
    </div>
  )
}
