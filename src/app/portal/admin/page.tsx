'use client'
import { Settings } from 'lucide-react'
import { useThemeStore } from '@/store/themeStore'

export default function PageAdmin() {
  const t = useThemeStore((s) => s.tokens)
  return (
    <div className="flex-1 flex items-center justify-center min-h-[400px]" style={{ color: t.muted }}>
      <div className="text-center">
        <Settings size={40} className="mx-auto mb-4 opacity-30" />
        <div className="text-sm font-semibold mb-1">Configurações</div>
        <div className="text-[11px]">Em construção — Fase 3</div>
      </div>
    </div>
  )
}
