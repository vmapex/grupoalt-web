const { withSentryConfig } = require('@sentry/nextjs')

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL
    if (!apiUrl) {
      console.warn('NEXT_PUBLIC_API_URL not set — API proxy will not work')
      return []
    }
    return [
      {
        source: '/api/proxy/:path*',
        destination: `${apiUrl}/:path*`,
      },
    ]
  },
  async redirects() {
    // Step 12: /dashboard/* e legado -> redireciona pra /portal/financeiro/*,
    // que por sua vez (unificacao 2026-07-14) redireciona pra /bi/financeiro/*.
    // O espelho /portal/financeiro foi REMOVIDO: o BI e a unica implementacao
    // das telas financeiras (a Sidebar ja apontava pra ele). Encadear 308s e
    // ok — o browser segue; regras especificas (cp/cr -> cp-cr) vem ANTES do
    // catch-all porque o Next avalia na ordem.
    return [
      {
        source: '/dashboard',
        destination: '/portal/financeiro/caixa',
        permanent: true,
      },
      {
        source: '/dashboard/:path*',
        destination: '/portal/financeiro/:path*',
        permanent: true,
      },
      {
        source: '/portal/financeiro/cp',
        destination: '/bi/financeiro/cp-cr',
        permanent: true,
      },
      {
        source: '/portal/financeiro/cr',
        destination: '/bi/financeiro/cp-cr?tab=cr',
        permanent: true,
      },
      {
        source: '/portal/financeiro',
        destination: '/bi/financeiro',
        permanent: true,
      },
      {
        source: '/portal/financeiro/:path*',
        destination: '/bi/financeiro/:path*',
        permanent: true,
      },
    ]
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          // Step 10 — Fase 4: o `Content-Security-Policy` é definido
          // dinamicamente pelo middleware (`src/middleware.ts`) com nonce
          // por request. Mantê-lo aqui também causaria CSP duplicado.
        ],
      },
    ]
  },
}
// PR-11 (Fase 1B): wrap com Sentry. Sem NEXT_PUBLIC_SENTRY_DSN /
// SENTRY_AUTH_TOKEN configurados, withSentryConfig só faz no-op
// (não tenta upload de source maps).
module.exports = withSentryConfig(nextConfig, {
  // silent durante build se nenhum token de upload está disponível.
  silent: true,
  // Não tenta upload de source maps em build local (sem auth token).
  // Para ativar em produção: setar SENTRY_AUTH_TOKEN no Vercel.
  widenClientFileUpload: true,
  // Não injeta o tunnel route automaticamente — evita problemas com
  // o CSP/nonce do middleware. Se quiser ativar, garantir que o path
  // /monitoring esteja permitido em src/middleware.ts.
  tunnelRoute: undefined,
  disableLogger: true,
  // Sentry recomenda hidden source maps em prod para não vazar source
  // no bundle, mas requer upload. Mantemos default false aqui.
  hideSourceMaps: false,
})
