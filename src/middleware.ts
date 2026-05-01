import { NextRequest, NextResponse } from 'next/server'

/**
 * Step 10 — Fase 4: nonce dinâmico por request.
 *
 * Removemos `'unsafe-inline'` de `script-src` e habilitamos um nonce único
 * por request. O Next 14 (App Router) injeta scripts inline com dados de
 * hidratação (`__next_f.push(...)`); como o conteúdo varia, hash CSP
 * estático não cobre. A solução padrão é nonce + propagação via header
 * de request, que o Next aplica automaticamente nos seus scripts internos.
 *
 * Trade-off: usar `headers()` no `RootLayout` força todas as rotas a
 * virarem dinâmicas (não há prerender estático). Aceitável neste portal
 * autenticado/admin/BI, onde o HTML quase nunca é cacheável de qualquer
 * forma.
 */
export function middleware(request: NextRequest) {
  // Edge-runtime safe: crypto.getRandomValues + btoa (sem Buffer/Node).
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  const nonce = btoa(binary)

  const isDev = process.env.NODE_ENV !== 'production'

  // Em dev, o webpack runtime usa `eval()` para HMR / source-maps.
  // Em produção, `'unsafe-eval'` continua removido (Fase 3).
  const scriptSrc = isDev
    ? `script-src 'self' 'nonce-${nonce}' 'unsafe-eval'`
    : `script-src 'self' 'nonce-${nonce}'`

  const csp = [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob:",
    "connect-src 'self' https://api.grupoalt.agr.br https://api-staging.grupoalt.agr.br",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; ')

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  // Header de request usado pelo Next para aplicar `nonce={...}` nos
  // scripts internos do App Router (streaming SSR).
  requestHeaders.set('Content-Security-Policy', csp)

  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set('Content-Security-Policy', csp)
  return response
}

export const config = {
  matcher: [
    /*
     * Aplica o middleware a tudo, exceto:
     *   - api          → /api/* (inclui /api/proxy/* — proxy para a API)
     *   - _next/static → assets estáticos do Next
     *   - _next/image  → otimização de imagem do Next
     *   - favicon.ico  → favicon
     *
     * `missing` evita rodar em prefetches do App Router (que não
     * renderizam HTML novo e portanto não precisam de novo nonce).
     */
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
}
