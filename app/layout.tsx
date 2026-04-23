import type { Metadata, Viewport } from 'next'
import { Manrope, Space_Mono } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import { unstable_noStore as noStore } from 'next/cache'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { getSettings } from '@/lib/settings'
import './globals.css'

const manrope = Manrope({
  subsets: ['latin', 'cyrillic'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-sans',
  display: 'swap',
})

const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-mono',
  display: 'swap',
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
    'MAZE is a premium branding and design studio based in Tashkent, Uzbekistan. We craft bold brand identities, digital experiences, and strategic design systems for ambitious companies across Central Asia and globally.',
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
    url: SITE_URL,
    siteName: 'MAZE Studio',
    title: 'MAZE — Branding & Design Studio',
    description: 'Premium branding and design studio based in Tashkent, Uzbekistan.',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: 'MAZE — Branding & Design Studio' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MAZE — Branding & Design Studio',
    description: 'Premium branding and design studio based in Tashkent, Uzbekistan.',
    images: ['/og-image.jpg'],
    creator: '@mazestudio',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-video-preview': -1, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  manifest: '/site.webmanifest',
  alternates: {
    canonical: SITE_URL,
    languages: { 'en-US': `${SITE_URL}/en`, 'ru-RU': `${SITE_URL}/ru` },
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
      <head>
        <script
          type="text/javascript"
          dangerouslySetInnerHTML={{
            __html: `(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window,document,'script','https://mc.yandex.ru/metrika/tag.js','ym');ym(57206437,'init',{webvisor:true,clickmap:true,referrer:document.referrer,url:location.href,accurateTrackBounce:true,trackLinks:true});`,
          }}
        />
        <noscript>
          <div>
            <img src="https://mc.yandex.ru/watch/57206437" style={{ position: 'absolute', left: '-9999px' }} alt="" />
          </div>
        </noscript>
      </head>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange={false}
        >
          {children}
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
