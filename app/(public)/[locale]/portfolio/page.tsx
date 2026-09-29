import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { routing } from '@/i18n/routing'
import { PortfolioGrid } from '@/components/portfolio/PortfolioGrid'
import { getPublishedProjects } from '@/lib/portfolio'
import { JsonLd } from '@/components/JsonLd'
import { breadcrumbJsonLd, collectionPageJsonLd, freshest, portfolioListJsonLd, homeCrumb, portfolioCrumb } from '@/lib/jsonLd'
import { pageMeta } from '@/lib/seo'
import { TextReveal } from '@/components/ui/TextReveal'

interface Props {
  params: { locale: string }
}

export const dynamic = 'force-dynamic'

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({ params: { locale } }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'portfolio' })
  return pageMeta({
    locale,
    path: 'portfolio',
    title: t('metaTitle'),
    description: t('metaDesc'),
  })
}

export default async function PortfolioPage({ params: { locale } }: Props) {
  setRequestLocale(locale)
  const t        = await getTranslations({ locale, namespace: 'portfolio' })
  const projects = await getPublishedProjects()

  const isRu   = locale === 'ru'
  const crumbs = breadcrumbJsonLd([
    homeCrumb(locale, isRu ? 'Главная' : 'Home'),
    portfolioCrumb(locale, isRu ? 'Портфолио' : 'Portfolio'),
  ])

  return (
    <main className="min-h-screen">
      <JsonLd data={[
        crumbs,
        collectionPageJsonLd({
          path: '/portfolio',
          name: t('heading'),
          locale,
          description: t('subtitle'),
          dateModified: freshest(projects),
          numberOfItems: projects.length,
        }),
        portfolioListJsonLd(projects, locale),
      ]} />

      {/* Page header */}
      <section className="pt-28 pb-16 px-6 md:px-10 border-b border-maze-border">
        <div className="max-w-[1440px] mx-auto">
          <p className="label-sm text-maze-lime mb-5">{t('label')}</p>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <TextReveal as="h1" stagger className="display-md text-maze-cream max-w-xl">{t('heading')}</TextReveal>
            <p className="body-lg text-maze-muted max-w-sm md:text-right">
              {t('subtitle')}
            </p>
          </div>
        </div>
      </section>

      {/* Portfolio grid */}
      <section className="pt-12 pb-24 px-6 md:px-10">
        <div className="max-w-[1440px] mx-auto">
          {/* The grid was an unnamed region: a heading is how a crawler and a
              screen reader know where the list starts and what it is. Visually
              hidden because the h1 above already says it on screen. */}
          <h2 className="sr-only">{t('heading')}</h2>
          <PortfolioGrid projects={projects} />
        </div>
      </section>

    </main>
  )
}
