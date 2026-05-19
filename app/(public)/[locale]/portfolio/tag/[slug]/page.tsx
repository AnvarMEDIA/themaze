import type { Metadata } from 'next'
import { setRequestLocale, getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { routing } from '@/i18n/routing'
import { PortfolioGrid } from '@/components/portfolio/PortfolioGrid'
import { getTagSlugs, getProjectsByTagSlug } from '@/lib/portfolio'
import { JsonLd } from '@/components/JsonLd'
import { breadcrumbJsonLd, portfolioListJsonLd, homeCrumb, portfolioCrumb } from '@/lib/jsonLd'
import { localizedAlternates, SITE_URL } from '@/lib/seo'

interface Props {
  params: { locale: string; slug: string }
}

export const dynamic = 'force-dynamic'

export async function generateStaticParams() {
  const tags = await getTagSlugs(2)
  return routing.locales.flatMap((locale) =>
    tags.map(({ slug }) => ({ locale, slug })),
  )
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getProjectsByTagSlug(params.slug)
  if (!data) return {}
  const isRu = params.locale === 'ru'
  const title = isRu
    ? `${data.tag} — портфолио | MAZE Studio`
    : `${data.tag} — Portfolio | MAZE Studio`
  const description = isRu
    ? `Подборка проектов MAZE Studio с тегом «${data.tag}».`
    : `MAZE Studio projects tagged "${data.tag}".`
  return {
    title,
    description,
    alternates: localizedAlternates(params.locale, `portfolio/tag/${params.slug}`),
    openGraph: { title, description },
    twitter:   { card: 'summary_large_image', title, description },
  }
}

export default async function PortfolioTagPage({ params }: Props) {
  const data = await getProjectsByTagSlug(params.slug)
  if (!data) notFound()
  setRequestLocale(params.locale)

  const t = await getTranslations({ locale: params.locale, namespace: 'portfolio' })

  const isRu = params.locale === 'ru'
  const crumbs = breadcrumbJsonLd([
    homeCrumb(params.locale, isRu ? 'Главная' : 'Home'),
    portfolioCrumb(params.locale, isRu ? 'Портфолио' : 'Portfolio'),
    {
      name: `#${data.tag}`,
      url:  `${SITE_URL}${params.locale === 'en' ? '' : '/' + params.locale}/portfolio/tag/${params.slug}`,
    },
  ])

  return (
    <main className="min-h-screen">
      <JsonLd data={[crumbs, portfolioListJsonLd(data.projects, params.locale)]} />

      <section className="pt-28 pb-16 px-6 md:px-10 border-b border-maze-border">
        <div className="max-w-[1440px] mx-auto">
          <p className="label-sm text-maze-lime mb-5">{isRu ? 'Тег' : 'Tag'}</p>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <h1 className="display-md text-maze-cream max-w-xl">
              <span className="text-maze-muted">#</span>{data.tag}
            </h1>
            <p className="body-lg text-maze-muted max-w-sm md:text-right">
              {data.projects.length} {data.projects.length === 1 ? t('projectSingular') : t('projectPlural')}
            </p>
          </div>
        </div>
      </section>

      <section className="pt-12 pb-24 px-6 md:px-10">
        <div className="max-w-[1440px] mx-auto">
          <PortfolioGrid projects={data.projects} />
        </div>
      </section>
    </main>
  )
}
