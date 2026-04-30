'use client'

import { useAuthStore } from '@/store/authStore'
import { canAccessAdmin } from '@/lib/access'

/**
 * Estado de autorizacao admin para uma pagina protegida.
 * - 'loading'  : ainda nao sabemos quem e o usuario (auth em curso)
 * - 'allowed'  : usuario admin, pode renderizar a pagina
 * - 'denied'   : usuario autenticado, mas sem permissao admin
 *
 * O guard de autenticacao em si (redirect para /login se nao tem sessao)
 * fica no layout (PortalLayout / BIFinanceiroLayout). Aqui assumimos que
 * o layout ja resolveu a sessao.
 */
export type AdminAccess = 'loading' | 'allowed' | 'denied'

export function useRequireAdmin(): AdminAccess {
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  if (!isAuthenticated || !user) return 'loading'
  return canAccessAdmin(user) ? 'allowed' : 'denied'
}
