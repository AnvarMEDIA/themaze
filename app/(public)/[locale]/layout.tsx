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

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'ProfessionalService',
  name: 'MAZE Studio',
  description: 'Premium branding and design studio based in Tashkent, Uzbekistan',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.maze.uz',
  logo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.maze.uz'}/logo.svg`,
  foundingDate: '2019',
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Tashkent',
    addressCountry: 'UZ',
  },
  contactPoint: { '@type': 'ContactPoint', email: 'hello@maze.uz', contactType: 'customer service' },
  sameAs: [
    'https://instagram.com/mazestudio',
    'https://behance.net/mazestudio',
    'https://linkedin.com/company/mazestudio',
  ],
  priceRange: '$$$',
  serviceType: ['Brand Identity Design', 'Logo Design', 'UI/UX Design', 'Brand Strategy', 'Naming', 'Print Design', 'Motion Design'],
}

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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
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
