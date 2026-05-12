/**
 * Next 14 instrumentation hook — carrega Sentry server/edge config no boot.
 *
 * Roda uma vez por processo (server-side). Determina o runtime e
 * importa a config correspondente. Como os configs já são DSN-gated,
 * sem NEXT_PUBLIC_SENTRY_DSN configurado, é tudo no-op.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config')
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config')
  }
}
