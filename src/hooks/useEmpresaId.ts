'use client'
/* ═══════════════════════════════════════════════════════════════
   Hook: useEmpresaId
   Retorna o ID da empresa ativa para chamadas de API.

   STEP 11 — empresaStore.activeId é a fonte de verdade.
   authStore.empresaAtiva é apenas um espelho legado.

   Prioridade:
   1. empresaStore.activeId (persistido, validado contra empresas do usuário)
   2. authStore.empresaAtiva.id (fallback durante boot, antes do syncFromAuth)
   ═══════════════════════════════════════════════════════════════ */

import { useAuthStore } from '@/store/authStore'
import { useEmpresaStore } from '@/store/empresaStore'

export function useEmpresaId(): number | null {
  const empresaAtiva = useAuthStore((s) => s.empresaAtiva)
  const biActiveId = useEmpresaStore((s) => s.activeId)

  if (biActiveId) {
    const parsed = parseInt(biActiveId, 10)
    if (!isNaN(parsed)) return parsed
  }
  if (empresaAtiva?.id) return empresaAtiva.id
  return null
}
