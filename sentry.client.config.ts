/**
 * Sentry — client (browser) init.
 *
 * Carregado automaticamente pelo @sentry/nextjs / withSentryConfig.
 * Se NEXT_PUBLIC_SENTRY_DSN estiver vazio (default), Sentry.init é
 * pulado e o SDK fica inerte. Nenhum dado sai do app sem DSN.
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
    // Não envia PII (cookies, headers de auth, query strings com token).
    sendDefaultPii: false,
    // Não captura replays — economiza cota e evita gravar UI sensível.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    // Release: SHA do Vercel para agrupar erros por deploy.
    release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
  })
}
