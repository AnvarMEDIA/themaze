const createNextIntlPlugin = require('next-intl/plugin')
const { withSentryConfig } = require('@sentry/nextjs')

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

const isProd = process.env.NODE_ENV === 'production'

// Build the script-src dynamically so we can drop 'unsafe-eval' in prod.
// Next.js requires eval in dev for Fast Refresh, but not in production.
const scriptSrc = [
  "'self'",
  "'unsafe-inline'",
  ...(isProd ? [] : ["'unsafe-eval'"]),
  'https://va.vercel-scripts.com',
  // Yandex Metrika + Webvisor (tag.js, recorder, static assets)
  'https://mc.yandex.ru',
  'https://mc.yandex.com',
  'https://yastatic.net',
].join(' ')

const CSP = [
  "default-src 'self'",
  `script-src ${scriptSrc}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.vercel-storage.com https://images.unsplash.com https://mc.yandex.ru https://mc.yandex.com https://yastatic.net",
  "font-src 'self'",
  "connect-src 'self' https://vitals.vercel-insights.com https://va.vercel-scripts.com https://mc.yandex.ru https://mc.yandex.com https://yastatic.net",
  // Yandex Metrika injects a hidden iframe for cross-domain ID sync.
  "frame-src 'self' https://mc.yandex.ru https://mc.yandex.com",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  ...(isProd ? ['upgrade-insecure-requests'] : []),
].join('; ')

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.vercel-storage.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [{ key: 'Content-Security-Policy', value: CSP }],
      },
    ]
  },
}

const withIntl = withNextIntl(nextConfig)

// Only wrap with Sentry when a DSN is configured — otherwise skip the
// extra build step to keep local builds fast.
module.exports = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(withIntl, {
      // Passing the build-time auth token is optional; without it Sentry
      // skips source-map upload but runtime error reporting still works.
      org:             process.env.SENTRY_ORG,
      project:         process.env.SENTRY_PROJECT,
      authToken:       process.env.SENTRY_AUTH_TOKEN,
      silent:          true,
      widenClientFileUpload: true,
      disableLogger:   true,
    })
  : withIntl
