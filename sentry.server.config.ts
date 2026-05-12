/**
 * Sentry — server (Node.js / SSR / API routes) init.
 *
 * Carregado via instrumentation.ts. DSN vazio → SDK inerte.
 * Mesmo DSN usado pelo client (NEXT_PUBLIC_SENTRY_DSN) — Sentry
 * isola eventos por SDK no painel.
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
    release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
  })
}
