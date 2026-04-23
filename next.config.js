const createNextIntlPlugin = require('next-intl/plugin')
const { withSentryConfig } = require('@sentry/nextjs')

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

const CSP = [
  "default-src 'self'",
  // unsafe-eval required by Next.js dev; Vercel Analytics + Yandex Metrika need their hosts.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com https://mc.yandex.ru https://mc.yandex.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.vercel-storage.com https://images.unsplash.com https://mc.yandex.ru https://mc.yandex.com",
  "font-src 'self'",
  "connect-src 'self' https://vitals.vercel-insights.com https://va.vercel-scripts.com https://mc.yandex.ru https://mc.yandex.com",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
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
