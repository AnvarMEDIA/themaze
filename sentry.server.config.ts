/**
 * Server-side Sentry — runs in Node.js routes / RSC.
 * Initialised only when SENTRY_DSN is defined.
 */
import * as Sentry from '@sentry/nextjs'

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN
const env = process.env.VERCEL_ENV ?? process.env.NODE_ENV

if (dsn) {
  Sentry.init({
    dsn,
    environment: env,
    tracesSampleRate: env === 'production' ? 0.1 : 1.0,
  })
}
