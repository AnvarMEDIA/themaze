import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { Link } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'
import { getPublishedProjects } from '@/lib/portfolio'
import { JsonLd } from '@/components/JsonLd'
import {
  breadcrumbJsonLd,
  faqJsonLd,
  homeCrumb,
} from '@/lib/jsonLd'
import { pageMeta, notFoundMetadata, SITE_URL } from '@/lib/seo'
import { Trail } from '@/components/ui/Trail'
import { ProjectCard } from '@/components/portfolio/ProjectCard'
import { Arrow } from '@/components/ui/Arrow'
import type { ProjectCategory } from '@/lib/types'
import { SERVICE_SLUGS, isServiceSlug } from '@/lib/services'

interface Props {
  params: { locale: string; slug: string }
}

interface ServiceContent {
  metaTitle:       string
  metaDescription: string
  title:           string
  tagline:         string
  intro:           string
  approach:        Array<{ title: string; body: string }>
  deliverables:    string[]
  timeline:        string
  pricing:         string
  faq:             Array<{ q: string; a: string }>
}

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    SERVICE_SLUGS.map((slug) => ({ locale, slug })),
  )
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (!isServiceSlug(params.slug)) return notFoundMetadata
  const t = await getTranslations({ locale: params.locale, namespace: `servicesPage.cluster.${params.slug}` })
  const metaTitle = t('metaTitle')
  const metaDesc  = t('metaDescription')
  return pageMeta({
    locale: params.locale,
    path: `services/${params.slug}`,
    title: metaTitle,
    description: metaDesc,
  })
}

export default async function ServiceClusterPage({ params }: Props) {
  if (!isServiceSlug(params.slug)) notFound()
  setRequestLocale(params.locale)
  const { locale, slug } = params

  const [tCluster, tLabels, tNav, tHome, projects] = await Promise.all([
    getTranslations({ locale, namespace: `servicesPage.cluster.${slug}` }),
    getTranslations({ locale, namespace: 'servicesPage.cluster._labels' }),
    getTranslations({ locale, namespace: 'nav' }),
    getTranslations({ locale, namespace: 'home.services' }),
    getPublishedProjects(),
  ])

  const content: ServiceContent = {
    metaTitle:       tCluster('metaTitle'),
    metaDescription: tCluster('metaDescription'),
    title:           tCluster('title'),
    tagline:         tCluster('tagline'),
    intro:           tCluster('intro'),
    approach:        tCluster.raw('approach')     as ServiceContent['approach'],
    deliverables:    tCluster.raw('deliverables') as string[],
    timeline:        tCluster('timeline'),
    pricing:         tCluster('pricing'),
    faq:             tCluster.raw('faq')          as ServiceContent['faq'],
  }

  const isRu = locale === 'ru'
  const related = projects
    .filter((p) => p.categories.includes(slug as ProjectCategory))
    .slice(0, 3)

  const crumbs = breadcrumbJsonLd([
    homeCrumb(locale, isRu ? 'Главная' : 'Home'),
    {
      name: isRu ? 'Услуги' : 'Services',
      url:  `${SITE_URL}${locale === 'en' ? '' : '/' + locale}/services`,
    },
    {
      name: content.title,
      url:  `${SITE_URL}${locale === 'en' ? '' : '/' + locale}/services/${slug}`,
    },
  ])

  const serviceLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: content.title,
    description: content.metaDescription,
    serviceType: content.title,
    provider: { '@id': `${SITE_URL}/#organization` },
    areaServed: ['Uzbekistan', 'Kazakhstan', 'Kyrgyzstan', 'Tajikistan'],
    inLanguage: locale,
    url: `${SITE_URL}${locale === 'en' ? '' : '/' + locale}/services/${slug}`,
  }

  return (
    <article className="pt-28 min-h-screen">
      <JsonLd
        data={[
          crumbs,
          serviceLd,
          faqJsonLd(content.faq.map((f) => ({ question: f.q, answer: f.a })), locale),
        ]}
      />

      {/* Hero */}
      <header className="px-6 md:px-10 pt-10 md:pt-14 pb-14 border-b border-maze-border">
        <div className="max-w-[1440px] mx-auto">
          <Trail steps={[{ label: tNav('services'), href: '/services' }, { label: content.title }]} />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-10 gap-y-8 lg:items-end">
            <div className="lg:col-span-8">
              <h1 className="display-md text-maze-cream mb-4 text-balance">{content.title}</h1>
              <p className="heading-md text-maze-muted text-pretty">{content.tagline}</p>
              <p className="mt-5 font-mono text-xs text-maze-muted">{tHome(`durations.${slug}`)}</p>
            </div>
            <div className="lg:col-span-4 flex flex-wrap lg:flex-col items-center lg:items-end gap-x-7 gap-y-2">
              <Link href={`/contact?service=${slug}`} className="btn btn-primary">
                {tLabels('cta')}
                <Arrow direction="right" className="text-base" />
              </Link>
              <Link href={`/portfolio/category/${slug}`} className="link-arrow">
                {tLabels('seePortfolio')}
                <Arrow direction="right" className="text-base" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Intro */}
      <section className="px-6 md:px-10 py-16 md:py-20 border-b border-maze-border">
        <div className="max-w-3xl mx-auto">
          <p className="body-lg text-maze-cream leading-relaxed whitespace-pre-line">
            {content.intro}
          </p>
        </div>
      </section>

      {/* Approach */}
      <section className="px-6 md:px-10 py-16 md:py-24 border-b border-maze-border">
        <div className="max-w-[1440px] mx-auto">
          <h2 className="heading-lg text-maze-cream mb-12 max-w-2xl">
            {tLabels('approach')}
          </h2>
          <ol className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
            {content.approach.map((step, i) => (
              <li key={i} className="flex gap-6">
                <span className="font-mono text-xs text-maze-muted tabular-nums shrink-0 mt-1.5">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <h3 className="heading-md text-maze-cream mb-2">{step.title}</h3>
                  <p className="body-lg text-maze-muted leading-relaxed">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Deliverables + Timeline + Pricing */}
      <section className="px-6 md:px-10 py-16 md:py-24 border-b border-maze-border">
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2">
            <h2 className="heading-lg text-maze-cream mb-8">
              {tLabels('deliverables')}
            </h2>
            <ul className="space-y-3">
              {content.deliverables.map((d) => (
                <li key={d} className="flex items-start gap-3">
                  <span aria-hidden="true" className="w-1.5 h-1.5 bg-maze-muted shrink-0 mt-3" />
                  <span className="body-lg text-maze-cream">{d}</span>
                </li>
              ))}
            </ul>
          </div>
          <aside className="space-y-8">
            <div>
              <p className="label-sm text-maze-muted mb-2">{tLabels('timeline')}</p>
              <p className="body-lg text-maze-cream leading-relaxed">{content.timeline}</p>
            </div>
            <div>
              <p className="label-sm text-maze-muted mb-2">{tLabels('pricing')}</p>
              <p className="body-lg text-maze-cream leading-relaxed">{content.pricing}</p>
            </div>
          </aside>
        </div>
      </section>

      {/* Related work — pulls projects from the matching portfolio category */}
      {related.length > 0 && (
        <section className="px-6 md:px-10 py-16 md:py-24 border-b border-maze-border">
          <div className="max-w-[1440px] mx-auto">
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 mb-10">
              <h2 className="heading-lg text-maze-cream">{tLabels('selectedWork')}</h2>
              <Link href={`/portfolio/category/${slug}`} className="link-arrow">
                {tLabels('seePortfolio')}
                <Arrow direction="right" className="text-base" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-5 gap-y-10">
              {related.map((project, i) => (
                <ProjectCard key={project.id} project={project} index={i} priority={false} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="px-6 md:px-10 py-16 md:py-24 border-b border-maze-border">
        <div className="max-w-3xl mx-auto">
          <h2 className="heading-lg text-maze-cream mb-5">{tLabels('faq')}</h2>
          {/* Who is answering, and from where.
              A retriever quotes a passage, not a page: every chunk taken from
              these nine pages said "we" and named neither the studio nor the
              city, which makes it unusable in an answer to "who does branding
              in Tashkent". One factual line, next to the questions it belongs
              to — and it reads as normal page furniture to a person too. */}
          <p className="body-lg text-maze-muted mb-12 leading-relaxed">{tLabels('studioLine')}</p>
          <div className="divide-y divide-maze-border border-y border-maze-border">
            {content.faq.map((item, i) => (
              <details key={i} className="group">
                <summary className="flex items-baseline justify-between gap-4 cursor-pointer py-5 list-none [&::-webkit-details-marker]:hidden">
                  <span className="heading-md text-maze-cream transition-colors [@media(hover:hover)_and_(pointer:fine)]:group-hover:text-maze-lime">
                    {item.q}
                  </span>
                  <span
                    aria-hidden="true"
                    className="font-mono text-sm text-maze-muted shrink-0 transition-transform duration-200 ease-out group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="body-lg text-maze-muted pb-6 leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

    </article>
  )
}
