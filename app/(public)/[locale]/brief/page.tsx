import type { Metadata } from 'next'
import { setRequestLocale, getTranslations } from 'next-intl/server'
import { routing } from '@/i18n/routing'
import { BriefForm } from '@/components/brief/BriefForm'
import { BriefMessages } from '@/components/brief/BriefMessages'
import { getBriefContent, localizeBrief } from '@/lib/briefContent'
import { JsonLd } from '@/components/JsonLd'
import { breadcrumbJsonLd, homeCrumb } from '@/lib/jsonLd'
import { pageMeta, SITE_URL } from '@/lib/seo'

interface Props {
  params: { locale: string }
}

// The questions are the admin's (/admin/briefs/form): a save revalidates
// this page at once, and this is the backstop if that ever misses.
export const revalidate = 600

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({ params: { locale } }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'brief' })
  return pageMeta({
    locale,
    path: 'brief',
    title: t('metaTitle'),
    description: t('metaDesc'),
    robots: { index: true, follow: true },
  })
}

export default async function BriefPage({ params: { locale } }: Props) {
  setRequestLocale(locale)
  const brief = localizeBrief(await getBriefContent(), locale === 'ru' ? 'ru' : 'en')
  const homeLabel = locale === 'ru' ? 'Главная' : locale === 'uz' ? 'Bosh sahifa' : 'Home'

  const crumbs = breadcrumbJsonLd([
    homeCrumb(locale, homeLabel),
    {
      name: brief.label,
      url:  `${SITE_URL}${locale === 'en' ? '' : '/' + locale}/brief`,
    },
  ])

  return (
    <div className="min-h-screen">
      <JsonLd data={crumbs} />

      {/* Hero header. On a wide screen the form has the brief sheet beside
          it, so both blocks take the wider container and the heading keeps
          to the form's column, aligned with it. */}
      <section className="pt-28 pb-12 px-6 md:px-10 border-b border-maze-border">
        <div className="max-w-3xl lg:max-w-6xl mx-auto">
          <div className="max-w-3xl">
            <p className="label-sm text-maze-lime mb-5">{brief.label}</p>
            <h1 className="display-md text-maze-cream mb-4">{brief.heading}</h1>
            {brief.sub && <p className="body-lg text-maze-muted max-w-lg">{brief.sub}</p>}
          </div>
        </div>
      </section>

      {/* Form */}
      <section className="py-16 px-6 md:px-10">
        <div className="max-w-3xl lg:max-w-6xl mx-auto">
          <BriefMessages brief={brief}>
            <BriefForm />
          </BriefMessages>
        </div>
      </section>
    </div>
  )
}
