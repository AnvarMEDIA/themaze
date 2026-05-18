import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { routing } from '@/i18n/routing'
import { PortfolioGrid } from '@/components/portfolio/PortfolioGrid'
import { getPublishedProjects } from '@/lib/portfolio'
import { JsonLd } from '@/components/JsonLd'
import { breadcrumbJsonLd, portfolioListJsonLd, homeCrumb, portfolioCrumb } from '@/lib/jsonLd'
import { localizedAlternates, SITE_URL } from '@/lib/seo'
import { VALID_CATEGORIES, categoryLabel } from '@/lib/utils'
import type { ProjectCategory } from '@/lib/types'

interface Props {
  params: { locale: string; slug: string }
}

export const dynamic = 'force-dynamic'

function isCategory(s: string): s is ProjectCategory {
  return VALID_CATEGORIES.includes(s)
}

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    VALID_CATEGORIES.map((slug) => ({ locale, slug })),
  )
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (!isCategory(params.slug)) return {}
  const isRu  = params.locale === 'ru'
  const label = categoryLabel(params.slug, params.locale)
  const title = isRu
    ? `${label} — портфолио | MAZE Studio Ташкент`
    : `${label} — Portfolio | MAZE Studio Tashkent`
  const description = isRu
    ? `Кейсы MAZE Studio в категории «${label}». Брендинговая студия в Ташкенте, проекты для компаний Узбекистана и Центральной Азии.`
    : `MAZE Studio ${label.toLowerCase()} case studies. A Tashkent-based branding studio working with brands across Uzbekistan and Central Asia.`
  return {
    title,
    description,
    alternates: localizedAlternates(params.locale, `portfolio/category/${params.slug}`),
    openGraph: { title, description },
    twitter:   { card: 'summary_large_image', title, description },
  }
}

export default async function PortfolioCategoryPage({ params }: Props) {
  if (!isCategory(params.slug)) notFound()
  setRequestLocale(params.locale)

  const [t, allProjects] = await Promise.all([
    getTranslations({ locale: params.locale, namespace: 'portfolio' }),
    getPublishedProjects(),
  ])
  const matching = allProjects.filter((p) => p.categories.includes(params.slug as ProjectCategory))
  if (matching.length === 0) notFound()

  const isRu  = params.locale === 'ru'
  const label = categoryLabel(params.slug, params.locale)

  const crumbs = breadcrumbJsonLd([
    homeCrumb(params.locale, isRu ? 'Главная' : 'Home'),
    portfolioCrumb(params.locale, isRu ? 'Портфолио' : 'Portfolio'),
    {
      name: label,
      url: `${SITE_URL}${params.locale === 'en' ? '' : '/' + params.locale}/portfolio/category/${params.slug}`,
    },
  ])

  return (
    <main className="min-h-screen">
      <JsonLd data={[crumbs, portfolioListJsonLd(matching, params.locale)]} />

      <section className="pt-28 pb-16 px-6 md:px-10 border-b border-maze-border">
        <div className="max-w-[1440px] mx-auto">
          <p className="label-sm text-maze-lime mb-5">
            {isRu ? 'Категория' : 'Category'}
          </p>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <h1 className="display-md text-maze-cream max-w-xl">
              {isRu ? `${label} — наши работы` : `${label} — our work`}
            </h1>
            <p className="body-lg text-maze-muted max-w-sm md:text-right">
              {matching.length} {matching.length === 1 ? t('projectSingular') : t('projectPlural')}
            </p>
          </div>
        </div>
      </section>

      <section className="pt-12 pb-24 px-6 md:px-10">
        <div className="max-w-[1440px] mx-auto">
          <PortfolioGrid projects={allProjects} activeCategory={params.slug as ProjectCategory} />
        </div>
      </section>
    </main>
  )
}
