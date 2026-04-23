import { NextIntlClientProvider } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { routing } from '@/i18n/routing'
import { Navbar }       from '@/components/layout/Navbar'
import { Footer }       from '@/components/layout/Footer'
import { CustomCursor } from '@/components/layout/CustomCursor'
import { SmoothScroll } from '@/components/layout/SmoothScroll'
import { JsonLd }       from '@/components/JsonLd'
import { Toaster }      from 'react-hot-toast'
import { getSettings }  from '@/lib/settings'
import { organizationJsonLd, websiteJsonLd } from '@/lib/jsonLd'

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
      <JsonLd id="ld-organization" data={organizationJsonLd(settings)} />
      <JsonLd id="ld-website"      data={websiteJsonLd()} />
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
