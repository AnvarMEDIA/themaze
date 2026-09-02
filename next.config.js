const createNextIntlPlugin = require('next-intl/plugin')
const { withSentryConfig } = require('@sentry/nextjs')

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

const isProd = process.env.NODE_ENV === 'production'

// Build the script-src dynamically so we can drop 'unsafe-eval' in prod.
// Next.js requires eval in dev for Fast Refresh, but not in production.
/**
 * Google Tag Manager and the analytics it usually carries.
 *
 * The GTM snippet in the layout is an INLINE script that injects a second,
 * external one from googletagmanager.com. `'unsafe-inline'` let the first
 * half run, and the missing host silently blocked the second — so the
 * container was installed, referenced on every page, and never once loaded.
 * Everything deployed through it (GA4, Search Console verification,
 * conversions) was dead, and the only trace was a console line nobody reads.
 *
 * GA4's collection endpoints are listed too, because a container that loads
 * and then has its every tag refused is the same failure one level down.
 * Anything else added to the container later needs its host added here as
 * well — that is the cost of having a CSP at all, and it is worth paying.
 */
const GTM = 'https://www.googletagmanager.com'
const GA_ENDPOINTS = [
  'https://www.google-analytics.com',
  // Regional collectors: region1.google-analytics.com and friends.
  'https://*.google-analytics.com',
  'https://*.analytics.google.com',
]

const scriptSrc = [
  "'self'",
  "'unsafe-inline'",
  ...(isProd ? [] : ["'unsafe-eval'"]),
  'https://va.vercel-scripts.com',
  // Yandex Metrika + Webvisor (tag.js, recorder, static assets)
  'https://mc.yandex.ru',
  'https://mc.yandex.com',
  'https://yastatic.net',
  GTM,
  'https://www.google-analytics.com',
].join(' ')

const CSP = [
  "default-src 'self'",
  `script-src ${scriptSrc}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://*.vercel-storage.com https://images.unsplash.com https://mc.yandex.ru https://mc.yandex.com https://yastatic.net ${GTM} https://www.google-analytics.com`,
  "font-src 'self'",
  `connect-src 'self' https://vitals.vercel-insights.com https://va.vercel-scripts.com https://mc.yandex.ru https://mc.yandex.com https://yastatic.net ${GTM} ${GA_ENDPOINTS.join(' ')}`,
  // Yandex Metrika injects a hidden iframe for cross-domain ID sync; GTM's
  // <noscript> fallback is an iframe on ns.html.
  `frame-src 'self' https://mc.yandex.ru https://mc.yandex.com ${GTM}`,
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
  async redirects() {
    return [
      // MFC moved out of Finance into a section of its own. Bookmarks and the
      // browser's own address-bar history still point at the old paths, and a
      // 404 on the screen someone opens several times a day is not an
      // acceptable way to tell them something was reorganised.
      //
      // Temporary (307), not permanent: a 308 is cached by browsers forever,
      // and a URL under /admin should stay ours to reuse.
      { source: '/admin/finance/mfc', destination: '/admin/mfc', permanent: false },
      { source: '/admin/finance/mfc/:path*', destination: '/admin/mfc/:path*', permanent: false },
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
