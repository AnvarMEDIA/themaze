import type { Metadata, Viewport } from 'next'
import { Manrope, Space_Mono } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import { unstable_noStore as noStore } from 'next/cache'
import { getSettings } from '@/lib/settings'
import { GoogleTagManager, GoogleTagManagerNoScript } from '@/components/GoogleTagManager'
import './globals.css'

// Trimmed to the weights actually used in the codebase (audited via
// font-medium / font-bold / font-black usage). Dropping the 300 weight
// saves one woff2 per locale subset on first paint.
const manrope = Manrope({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
  display: 'swap',
})

// Space_Mono is only used in tiny admin / debug spots. Skip the
// preload <link> so the public critical-path stays lean — the font
// still loads on demand when the page actually needs it.
const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-mono',
  display: 'swap',
  preload: false,
})

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.maze.uz'

export async function generateMetadata(): Promise<Metadata> {
  noStore()
  const settings = await getSettings().catch(() => null)
  const customFavicon = settings?.favicon?.trim()

  // Cache-bust using the uploaded filename so browsers refetch when the admin
  // replaces the favicon. Fallback to Date.now() for external URLs.
  const version = customFavicon
    ? customFavicon.split('/').pop()?.split('?')[0] ?? Date.now()
    : null

  const icons: Metadata['icons'] = customFavicon
    ? {
        icon:  [{ url: `/api/favicon?v=${version}`, type: 'image/x-icon' }],
        apple: `/api/favicon?v=${version}`,
      }
    : {
        icon: [
          { url: '/favicon.ico' },
          { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
          { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
        ],
        apple: '/apple-touch-icon.png',
      }

  return { ...baseMetadata, icons }
}

const baseMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'MAZE — Branding & Design Studio | Tashkent, Uzbekistan',
    template: '%s | MAZE Studio',
  },
  description:
    'MAZE is a premium branding and design studio in Tashkent, Uzbekistan — brand identities, digital experiences and design systems for ambitious companies.',
  keywords: [
    // English — brand & service keywords
    'branding studio Tashkent',
    'branding agency Uzbekistan',
    'brand identity design Tashkent',
    'logo design Uzbekistan',
    'graphic design Tashkent',
    'visual identity design',
    'brand strategy Central Asia',
    'naming agency Tashkent',
    'packaging design Uzbekistan',
    'UI UX design Tashkent',
    'motion design studio',
    'brand book design',
    'creative agency Tashkent',
    'design studio Uzbekistan',
    'MAZE Studio',
    'MAZE branding',
    // Russian — brand & service keywords
    'брендинг студия Ташкент',
    'брендинговое агентство Узбекистан',
    'фирменный стиль Ташкент',
    'разработка логотипа Ташкент',
    'дизайн агентство Узбекистан',
    'айдентика Ташкент',
    'нейминг бренда',
    'упаковка дизайн',
    'визуальная идентичность',
    'брендбук разработка',
    'дизайн студия Центральная Азия',
    'стратегия бренда',
  ],
  authors: [{ name: 'MAZE Studio', url: SITE_URL }],
  creator: 'MAZE Studio',
  publisher: 'MAZE Studio',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    alternateLocale: ['ru_RU'],
    // NOTE: intentionally NO `url`. Public pages build their own complete
    // openGraph via `pageMeta`; anything that doesn't (admin, error, 404) is
    // noindex, and inheriting the homepage URL here made every one of them
    // announce the homepage as the target of a share.
    siteName: 'MAZE Studio',
    title: 'MAZE — Branding & Design Studio',
    description: 'Premium branding and design studio based in Tashkent, Uzbekistan.',
    // og:image is supplied by the generated app/(public)/[locale]/opengraph-image.tsx
    // (a real, branded 1200×630). No static /og-image.jpg to 404.
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MAZE — Branding & Design Studio',
    description: 'Premium branding and design studio based in Tashkent, Uzbekistan.',
    // twitter:image falls back to the generated og:image.
    creator: '@mazestudio',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-video-preview': -1, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  verification: {
    yandex: '90dee1899184f344',
  },
  manifest: '/site.webmanifest',
  // NOTE: intentionally NO `canonical` or `languages` here. A canonical set
  // on the root layout is inherited by every page that doesn't override it
  // (e.g. a not-found route whose generateMetadata returns `{}`), which makes
  // those URLs falsely declare the homepage as their canonical — Google then
  // reports "Duplicate without user-selected canonical". Each public page sets
  // its own self-referential canonical + hreflang via `localizedAlternates`.
  // Pages that set nothing correctly emit no canonical and self-canonicalize.
  alternates: {
    types: { 'application/rss+xml': `${SITE_URL}/feed.xml` },
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#080808',
}

/** Root layout — minimal shell. Public locale layout adds Navbar/Footer/animations. */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${manrope.variable} ${spaceMono.variable}`}
    >
      <body>
        {/* Google Tag Manager (noscript) — must be the first element
            inside <body> per Google's install instructions. */}
        <GoogleTagManagerNoScript />
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange={false}
        >
          {children}
        </ThemeProvider>
        {/* Google Tag Manager loader (afterInteractive). Yandex.Metrika
            & Vercel Analytics are still loaded by <Analytics /> in
            app/(public)/[locale]/layout.tsx — only after consent. */}
        <GoogleTagManager />
      </body>
    </html>
  )
}
