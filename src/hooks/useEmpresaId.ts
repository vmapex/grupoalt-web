'use client'
/* ═══════════════════════════════════════════════════════════════
   Hook: useEmpresaId
   Retorna o ID da empresa ativa para chamadas de API.

   Prioridade:
   1. authStore.empresaAtiva.id (empresa real do backend)
   2. empresaStore.activeId (fallback para BI standalone)
   ═══════════════════════════════════════════════════════════════ */

import { useAuthStore } from '@/store/authStore'
import { useEmpresaStore } from '@/store/empresaStore'

export function useEmpresaId(): number | null {
  const empresaAtiva = useAuthStore((s) => s.empresaAtiva)
  const biActiveId = useEmpresaStore((s) => s.activeId)

  if (empresaAtiva?.id) return empresaAtiva.id
  const parsed = parseInt(biActiveId, 10)
  return isNaN(parsed) ? null : parsed
}
