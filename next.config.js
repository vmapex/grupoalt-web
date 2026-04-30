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
          {
            key: 'Content-Security-Policy',
            // Step 10 (CSP/Headers — fase controlada):
            //  - connect-src restrito aos hosts realmente usados (chamadas client-side
            //    saem por /api/proxy/* — 'self' — mas API canônica fica explícita).
            //  - img-src sem 'https:' aberto (logos vêm como data: e /public).
            //  - 'unsafe-eval' removido (Fase 3): chunks usam Function("return this")
            //    apenas como fallback após globalThis/window — short-circuit em
            //    qualquer browser evergreen suportado pelo Next 14.
            //  - 'unsafe-inline' fica até o bootstrap de tema em layout.tsx virar
            //    nonce/hash (Fase 4).
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob:",
              "connect-src 'self' https://api.grupoalt.agr.br https://api-staging.grupoalt.agr.br",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "object-src 'none'",
            ].join('; '),
          },
        ],
      },
    ]
  },
}
module.exports = nextConfig
