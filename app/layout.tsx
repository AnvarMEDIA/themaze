import type { Metadata, Viewport } from 'next'
import { Space_Grotesk, Space_Mono } from 'next/font/google'
import './globals.css'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-space',
  display: 'swap',
})

const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-mono',
  display: 'swap',
})

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.maze.uz'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'MAZE — Branding & Design Studio | Tashkent, Uzbekistan',
    template: '%s | MAZE Studio',
  },
  description:
    'MAZE is a premium branding and design studio based in Tashkent, Uzbekistan. We craft bold brand identities, digital experiences, and strategic design systems for ambitious companies across Central Asia and globally.',
  keywords: [
    'branding studio Tashkent',
    'design agency Uzbekistan',
    'brand identity Tashkent',
    'logo design Uzbekistan',
    'graphic design Tashkent',
    'UI UX design Uzbekistan',
    'creative agency Tashkent',
    'MAZE Studio',
    'брендинг Ташкент',
    'дизайн агентство Узбекистан',
  ],
  authors: [{ name: 'MAZE Studio', url: SITE_URL }],
  creator: 'MAZE Studio',
  publisher: 'MAZE Studio',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    alternateLocale: ['ru_RU', 'uz_UZ'],
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
  icons: {
    icon: [{ url: '/favicon.ico' }, { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' }, { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' }],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
  alternates: {
    canonical: SITE_URL,
    languages: { 'en-US': `${SITE_URL}/en`, 'ru-RU': `${SITE_URL}/ru`, 'uz-UZ': `${SITE_URL}/uz` },
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#080808',
}

/** Root layout — minimal shell. Public layout adds Navbar/Footer/animations. */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${spaceMono.variable}`}>
      <body>{children}</body>
    </html>
  )
}
