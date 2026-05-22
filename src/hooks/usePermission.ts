'use client'
/* ═══════════════════════════════════════════════════════════════
   Hooks de RBAC granular — Fase A PR 3 (2026-05-22).

   - `useFetchPermissoesAtivas()` — efeito que dispara fetch ao montar
     e quando a empresa ativa muda. Use UMA VEZ no layout BI/Portal.
   - `usePermissoesAtivas()` — retorna o response cacheado da empresa
     ativa (ou undefined enquanto carrega).
   - `usePermission(modulo, acao)` — retorna boolean (true se concedido).
   - `useIsAdminGlobal()` — atalho pra is_admin_global da empresa ativa.
   - `useExportsConfidencial()` — atalho pra marca d'agua de PDFs.
   ═══════════════════════════════════════════════════════════════ */

import { useEffect } from 'react'
import {
  hasPermissionIn,
  usePermissoesStore,
  type PermissoesEmpresa,
} from '@/store/permissoesStore'
import { useEmpresaStore } from '@/store/empresaStore'


function useActiveEmpresaIdNumeric(): number | null {
  const activeId = useEmpresaStore((s) => s.activeId)
  if (!activeId) return null
  const parsed = Number.parseInt(activeId, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}


/** Dispara fetch das permissoes para a empresa ativa quando ela muda.
 *  Use uma vez em layout (`bi/financeiro/layout.tsx` e equivalente
 *  do portal). NAO chame em cada componente — o cache funciona melhor
 *  com um unico ponto de entrada por arvore. */
export function useFetchPermissoesAtivas(): void {
  const empresaId = useActiveEmpresaIdNumeric()
  const fetch = usePermissoesStore((s) => s.fetch)

  useEffect(() => {
    if (empresaId === null) return
    void fetch(empresaId)
  }, [empresaId, fetch])
}


/** Retorna o response de permissoes da empresa ativa (ou undefined). */
export function usePermissoesAtivas(): PermissoesEmpresa | undefined {
  const empresaId = useActiveEmpresaIdNumeric()
  return usePermissoesStore((s) =>
    empresaId !== null ? s.porEmpresa[empresaId] : undefined,
  )
}


/** Hook principal: retorna true se o user tem (modulo, acao) na empresa ativa.
 *
 *  Comportamento durante o fetch (cache miss + loading):
 *  - Retorna `false` (gating "fail closed" — esconde ate confirmar). Isso
 *    evita flash de UI proibido. UI deve mostrar skeleton/spinner via
 *    `usePermissoesAtivas() === undefined`.
 *
 *  Comportamento sem empresa ativa: retorna `false`. */
export function usePermission(modulo: string, acao: string): boolean {
  const perms = usePermissoesAtivas()
  return hasPermissionIn(perms, modulo, acao)
}


/** Atalho: is_admin_global=True na empresa ativa? */
export function useIsAdminGlobal(): boolean {
  return usePermissoesAtivas()?.is_admin_global ?? false
}


/** Atalho: applies confidential watermark em PDFs exportados? */
export function useExportsConfidencial(): boolean {
  return usePermissoesAtivas()?.exports_confidencial ?? false
}
