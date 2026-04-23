const createNextIntlPlugin = require('next-intl/plugin')

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

module.exports = withNextIntl(nextConfig)
