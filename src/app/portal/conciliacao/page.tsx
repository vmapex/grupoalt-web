'use client'
import { BarChart3 } from 'lucide-react'
import { useThemeStore } from '@/store/themeStore'

export default function PageConciliacao() {
  const t = useThemeStore((s) => s.tokens)
  return (
    <div className="flex-1 flex items-center justify-center min-h-[400px]" style={{ color: t.muted }}>
      <div className="text-center">
        <BarChart3 size={40} className="mx-auto mb-4 opacity-30" />
        <div className="text-sm font-semibold mb-1">Conciliação Bancária</div>
        <div className="text-[11px]">Em construção — Fase 2</div>
      </div>
    </div>
  )
}
