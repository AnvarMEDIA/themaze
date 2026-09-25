import type { Metadata } from 'next'
import { setRequestLocale, getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { routing } from '@/i18n/routing'
import { PortfolioGrid } from '@/components/portfolio/PortfolioGrid'
import { Trail } from '@/components/ui/Trail'
import { getTagSlugs, getProjectsByTagSlug } from '@/lib/portfolio'
import { JsonLd } from '@/components/JsonLd'
import { breadcrumbJsonLd, collectionPageJsonLd, freshest, portfolioListJsonLd, homeCrumb, portfolioCrumb } from '@/lib/jsonLd'
import { pageMeta, notFoundMetadata, SITE_URL } from '@/lib/seo'

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
  if (!data) return notFoundMetadata
  const isRu = params.locale === 'ru'
  const title = isRu
    ? `${data.tag} — проекты студии`
    : `${data.tag} — Selected Projects`
  // A one-line "projects tagged X" description was under 50 characters, which
  // Google routinely discards in favour of scraped page text. Say what the
  // work actually is and where it was made.
  const description = isRu
    ? `Проекты MAZE Studio с тегом «${data.tag}» — айдентика, упаковка, полиграфия и цифровой дизайн из Ташкента, Узбекистан.`
    : `MAZE Studio projects tagged “${data.tag}” — brand identity, packaging, print and digital work from a design studio in Tashkent, Uzbekistan.`
  return pageMeta({
    locale: params.locale,
    path: `portfolio/tag/${params.slug}`,
    title,
    description,
  })
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
    <div className="min-h-screen">
      <JsonLd data={[
        crumbs,
        collectionPageJsonLd({
          path: `/portfolio/tag/${params.slug}`,
          name: `#${data.tag}`,
          locale: params.locale,
          dateModified: freshest(data.projects),
          numberOfItems: data.projects.length,
        }),
        portfolioListJsonLd(data.projects, params.locale),
      ]} />

      <section className="pt-[9.5rem] md:pt-[10.5rem] pb-14 px-6 md:px-10 border-b border-maze-border">
        <div className="max-w-[1440px] mx-auto">
          <Trail steps={[{ label: t('heading'), href: '/portfolio' }, { label: `#${data.tag}` }]} />
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
          <h2 className="sr-only">
            {isRu ? `Проекты по тегу «${data.tag}»` : `Projects tagged ${data.tag}`}
          </h2>
          <PortfolioGrid projects={data.projects} />
        </div>
      </section>
    </div>
  )
}
