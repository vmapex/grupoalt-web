/**
 * Sentry — edge runtime (Next middleware) init.
 *
 * Carregado via instrumentation.ts quando NEXT_RUNTIME === 'edge'.
 * DSN vazio → SDK inerte.
 */
import * as Sentry from '@sentry/nextjs'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    environment:
      process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ||
      process.env.NODE_ENV ||
      'production',
    tracesSampleRate: parseFloat(
      process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE || '0.1',
    ),
    sendDefaultPii: false,
  })
}
