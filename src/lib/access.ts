/**
 * Helpers centrais de autorizacao no frontend.
 *
 * Lembrete (Step 06/08): essas checagens sao apenas para UX. O backend
 * continua sendo a unica barreira de seguranca real e sempre deve responder
 * 403 quando uma chamada nao for permitida, mesmo que a UI tenha escondido
 * o botao.
 */

export interface AccessUser {
  id: number
  is_admin?: boolean
}

export interface AccessPermissao {
  modulo: string
  acao: string
  empresa_id?: number | null
}

/**
 * Allowlist de prefixos internos validos para navegacao dinamica
 * (rotas vindas da API, ex.: notificacoes). Mantenha em sincronia com
 * a estrutura real do app/router.
 */
export const ALLOWED_INTERNAL_ROUTE_PREFIXES = [
  '/portal',
  '/bi/financeiro',
] as const

/**
 * Step 09: valida se uma rota dinamica recebida da API pode ser usada
 * com router.push. Aceita SO caminhos internos absolutos comecando com
 * `/` que casem com a allowlist. Bloqueia esquemas perigosos (javascript:,
 * data:), protocolos externos (http(s)://) e protocol-relative `//host`.
 *
 * Retorna `null` quando a rota e invalida — o caller deve nao navegar
 * e opcionalmente avisar o usuario.
 */
export function safeInternalRoute(input: unknown): string | null {
  if (typeof input !== 'string') return null
  const route = input.trim()
  if (!route) return null
  if (!route.startsWith('/')) return null
  if (route.startsWith('//')) return null

  // Bloqueia esquemas perigosos mesmo que apareçam no meio da string
  // (e.g. via querystring construido pela API).
  const lowered = route.toLowerCase()
  if (
    lowered.includes('javascript:') ||
    lowered.includes('data:') ||
    lowered.includes('http://') ||
    lowered.includes('https://')
  ) {
    return null
  }

  const allowed = ALLOWED_INTERNAL_ROUTE_PREFIXES.some(
    (prefix) => route === prefix || route.startsWith(prefix + '/') || route.startsWith(prefix + '?'),
  )
  if (!allowed) return null

  return route
}

/** Quem pode acessar areas administrativas (CRUD usuarios/empresas/credenciais). */
export function canAccessAdmin(user: AccessUser | null | undefined): boolean {
  return !!user?.is_admin
}

/**
 * Quem pode acessar uma combinacao (modulo, acao) opcionalmente escopada
 * por empresa. Admin global sempre passa. Caso contrario procura na lista
 * de permissoes carregada no /auth/me.
 */
export function canAccessModule(
  user: AccessUser | null | undefined,
  permissoes: AccessPermissao[] | null | undefined,
  modulo: string,
  acao: string,
  empresaId?: number,
): boolean {
  if (!user) return false
  if (user.is_admin) return true
  if (!permissoes || permissoes.length === 0) return false
  return permissoes.some(p =>
    p.modulo === modulo &&
    p.acao === acao &&
    (p.empresa_id == null || p.empresa_id === empresaId),
  )
}

/** Quem pode entrar no wizard de setup inicial: admin sem empresas vinculadas. */
export function canAccessSetup(
  user: AccessUser | null | undefined,
  empresasCount: number,
): boolean {
  if (!user?.is_admin) return false
  return empresasCount === 0
}
