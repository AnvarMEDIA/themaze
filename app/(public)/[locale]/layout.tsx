import { NextIntlClientProvider } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { routing } from '@/i18n/routing'
import { Navbar }       from '@/components/layout/Navbar'
import { Footer }       from '@/components/layout/Footer'
import { CustomCursor } from '@/components/layout/CustomCursor'
import { SmoothScroll } from '@/components/layout/SmoothScroll'
import { Toaster }      from 'react-hot-toast'
import { getSettings }  from '@/lib/settings'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.maze.uz'

const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: 'MAZE Studio',
    alternateName: ['MAZE', 'MAZE Branding Studio', 'MAZE Design Studio'],
    description: 'Premium branding and design studio based in Tashkent, Uzbekistan. We craft bold brand identities, logo systems, naming, packaging, and strategic design for ambitious companies across Central Asia.',
    url: SITE_URL,
    logo: {
      '@type': 'ImageObject',
      url: `${SITE_URL}/logo.svg`,
      width: 200,
      height: 60,
    },
    foundingDate: '2019',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Tashkent',
      addressRegion: 'Tashkent',
      addressCountry: 'UZ',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'hello@maze.uz',
      contactType: 'customer service',
      areaServed: ['UZ', 'KZ', 'KG', 'TJ', 'TM', 'AZ', 'GE'],
      availableLanguage: ['English', 'Russian', 'Uzbek'],
    },
    sameAs: [
      'https://www.instagram.com/maze.uz',
      'https://www.behance.net/mazestudio',
      'https://www.linkedin.com/company/mazestudio',
    ],
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Branding & Design Services',
      itemListElement: [
        { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Brand Identity Design' } },
        { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Logo Design' } },
        { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Brand Strategy' } },
        { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Naming' } },
        { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Packaging Design' } },
        { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'UI/UX Design' } },
        { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Motion Design' } },
        { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Print Design' } },
      ],
    },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    url: SITE_URL,
    name: 'MAZE Studio',
    description: 'Branding & Design Studio — Tashkent, Uzbekistan',
    publisher: { '@id': `${SITE_URL}/#organization` },
    inLanguage: ['en', 'ru'],
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/portfolio?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  },
]

interface Props {
  children: React.ReactNode
  params: { locale: string }
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = params

  if (!routing.locales.includes(locale as 'en' | 'ru')) {
    notFound()
  }

  setRequestLocale(locale)

  const [messages, settings] = await Promise.all([getMessages(), getSettings()])

  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd[0]) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd[1]) }}
      />
      <SmoothScroll>
        <div className="noise">
          <CustomCursor />
          <Navbar />
          <main>{children}</main>
          <Footer settings={settings} />
        </div>
      </SmoothScroll>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'rgb(var(--surface))',
            color: 'rgb(var(--text))',
            border: '1px solid rgb(var(--border))',
            fontFamily: 'var(--font-sans)',
          },
        }}
      />
    </NextIntlClientProvider>
  )
}
