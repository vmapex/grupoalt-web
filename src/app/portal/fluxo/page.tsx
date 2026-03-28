'use client'
import { TrendingUp } from 'lucide-react'
import { useThemeStore } from '@/store/themeStore'

export default function PageFluxo() {
  const t = useThemeStore((s) => s.tokens)
  return (
    <div className="flex-1 flex items-center justify-center min-h-[400px]" style={{ color: t.muted }}>
      <div className="text-center">
        <TrendingUp size={40} className="mx-auto mb-4 opacity-30" />
        <div className="text-sm font-semibold mb-1">Fluxo de Caixa</div>
        <div className="text-[11px]">Em construção — Fase 2</div>
      </div>
    </div>
  )
}
