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
    // Step 12: rotas /dashboard/* sao legado. Mantemos compatibilidade de URLs
    // antigas redirecionando para a nova experiencia em /portal/financeiro/*.
    // Server-side (308) elimina o flash do redirect client-side anterior.
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
module.exports = nextConfig
