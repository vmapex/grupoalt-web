'use client'
import { Layers } from 'lucide-react'

export default function MVVPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-white tracking-tight mb-1">Missão | Visão | Valores</h1>
      <p className="text-sm text-zinc-400 mb-8">Diretrizes institucionais do grupo</p>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
        <Layers size={40} className="text-zinc-600 mx-auto mb-4" />
        <p className="text-zinc-500">Módulo em desenvolvimento</p>
      </div>
    </div>
  )
}
