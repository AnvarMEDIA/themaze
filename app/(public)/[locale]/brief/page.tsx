import type { Metadata } from 'next'
import { setRequestLocale, getTranslations } from 'next-intl/server'
import { routing } from '@/i18n/routing'
import { BriefForm } from '@/components/brief/BriefForm'
import { JsonLd } from '@/components/JsonLd'
import { breadcrumbJsonLd, homeCrumb } from '@/lib/jsonLd'
import { localizedAlternates, SITE_URL } from '@/lib/seo'

interface Props {
  params: { locale: string }
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({ params: { locale } }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'brief' })
  return {
    title:       t('metaTitle'),
    description: t('metaDesc'),
    alternates:  localizedAlternates(locale, 'brief'),
    robots:      { index: true, follow: true },
  }
}

export default async function BriefPage({ params: { locale } }: Props) {
  setRequestLocale(locale)
  const t    = await getTranslations({ locale, namespace: 'brief' })
  const isRu = locale === 'ru'

  const crumbs = breadcrumbJsonLd([
    homeCrumb(locale, isRu ? 'Главная' : 'Home'),
    {
      name: t('label'),
      url:  `${SITE_URL}${locale === 'en' ? '' : '/' + locale}/brief`,
    },
  ])

  return (
    <main className="min-h-screen">
      <JsonLd data={crumbs} />

      {/* Hero header */}
      <section className="pt-28 pb-12 px-6 md:px-10 border-b border-maze-border">
        <div className="max-w-3xl mx-auto">
          <p className="label-sm text-maze-lime mb-5">{t('label')}</p>
          <h1 className="display-md text-maze-cream mb-4">{t('heading')}</h1>
          <p className="body-lg text-maze-muted max-w-lg">{t('sub')}</p>
        </div>
      </section>

      {/* Form */}
      <section className="py-16 px-6 md:px-10">
        <div className="max-w-3xl mx-auto">
          <BriefForm />
        </div>
      </section>
    </main>
  )
}
