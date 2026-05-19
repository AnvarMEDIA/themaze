import { NextIntlClientProvider } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { routing } from '@/i18n/routing'
import { Navbar }       from '@/components/layout/Navbar'
import { Footer }       from '@/components/layout/Footer'
import { CustomCursor } from '@/components/layout/CustomCursor'
import { SmoothScroll } from '@/components/layout/SmoothScroll'
import { JsonLd }            from '@/components/JsonLd'
import { Analytics }         from '@/components/Analytics'
import { CookieBanner }      from '@/components/CookieBanner'
import { PageviewTracker }   from '@/components/PageviewTracker'
import { Toaster }           from 'react-hot-toast'
import { getSettings }  from '@/lib/settings'
import { organizationJsonLd, websiteJsonLd, localBusinessJsonLd } from '@/lib/jsonLd'

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
      <JsonLd id="ld-organization"   data={organizationJsonLd(settings)} />
      <JsonLd id="ld-localbusiness"  data={localBusinessJsonLd(settings)} />
      <JsonLd id="ld-website"        data={websiteJsonLd()} />
      <SmoothScroll>
        <div className="noise">
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-maze-lime focus:text-maze-ink focus:font-bold focus:rounded-lg"
          >
            Skip to main content
          </a>
          <CustomCursor />
          <Navbar />
          <main id="main-content">{children}</main>
          <Footer settings={settings} />
        </div>
      </SmoothScroll>
      <CookieBanner />
      <Analytics />
      <PageviewTracker />
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
