/**
 * Client-side Sentry — runs in the browser.
 * Initialised only when NEXT_PUBLIC_SENTRY_DSN is defined.
 */
import * as Sentry from '@sentry/nextjs'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN
const env = process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV

if (dsn) {
  Sentry.init({
    dsn,
    environment: env,
    tracesSampleRate: env === 'production' ? 0.1 : 1.0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0.2,
    ignoreErrors: [
      // Common noise from the browser.
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      'Non-Error promise rejection captured',
    ],
  })
}
