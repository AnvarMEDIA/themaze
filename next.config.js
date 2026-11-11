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
  // The bare host, which the line above does not match: a wildcard covers
  // subdomains only. The Google tag sends here for a visitor who has not
  // accepted cookies.
  'https://analytics.google.com',
]

/**
 * Google Ads: the conversion "Контакт" (lib/leadEvent.ts, lib/adsConversion.ts).
 *
 * The Google tag reports a conversion with requests to Google's ad servers,
 * and a CSP that does not name them refuses every one without a word, the
 * way it once refused the container itself (see above): the tag runs, the
 * form is sent, and the Ads conversion never shows a single event.
 *
 * These are the hosts the tag calls (the pings go out as images or as
 * beacons, hence both img-src and connect-src). If a new one turns up, the
 * console on a page that has just sent a form says "Refused to …" and names
 * it; it belongs here.
 */
const GOOGLE_ADS = [
  'https://www.googleadservices.com',
  'https://www.google.com',
  // googleads.g.doubleclick.net, stats.g.doubleclick.net
  'https://*.g.doubleclick.net',
  'https://pagead2.googlesyndication.com',
  // Not under g.doubleclick.net, so not covered by the line above.
  'https://ad.doubleclick.net',
  // Google's own domain for a visitor in Uzbekistan. Every country has one
  // (google.ru, google.kz, …) and a CSP cannot wildcard the ending of a
  // domain, so a visitor from another country is refused until theirs is
  // listed here as well.
  'https://www.google.co.uz',
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
  // The Ads side of the Google tag can fetch its own helper scripts.
  'https://www.googleadservices.com',
  'https://googleads.g.doubleclick.net',
].join(' ')

const CSP = [
  "default-src 'self'",
  `script-src ${scriptSrc}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://*.vercel-storage.com https://images.unsplash.com https://mc.yandex.ru https://mc.yandex.com https://yastatic.net ${GTM} https://www.google-analytics.com ${GOOGLE_ADS.join(' ')}`,
  "font-src 'self'",
  `connect-src 'self' https://vitals.vercel-insights.com https://va.vercel-scripts.com https://mc.yandex.ru https://mc.yandex.com https://yastatic.net ${GTM} ${GA_ENDPOINTS.join(' ')} ${GOOGLE_ADS.join(' ')}`,
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
    // The brief PDF (app/api/brief/[id]/pdf) is laid out by react-pdf, left
    // to Node rather than bundled, with the Manrope files it embeds for
    // Cyrillic: read from disk at run time, so they are traced in by hand.
    serverComponentsExternalPackages: ['@react-pdf/renderer'],
    outputFileTracingIncludes: {
      '/api/brief/[id]/pdf': ['./assets/fonts/**/*'],
    },
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
      // The brief's print-to-PDF page gave way to a real PDF file; a link to
      // the old page (a bookmark, an old message) gets the file, its ?lang
      // carried along.
      { source: '/admin/briefs/:id/print', destination: '/api/brief/:id/pdf', permanent: false },
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
