import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { Link } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'
import { getPublishedProjects } from '@/lib/portfolio'
import { JsonLd } from '@/components/JsonLd'
import {
  breadcrumbJsonLd,
  faqJsonLd,
  homeCrumb,
} from '@/lib/jsonLd'
import { localizedAlternates, ogLocale, SITE_URL, notFoundMetadata } from '@/lib/seo'
import { TextReveal } from '@/components/ui/TextReveal'
import { Arrow } from '@/components/ui/Arrow'
import type { ProjectCategory } from '@/lib/types'

const SERVICE_SLUGS = [
  'branding', 'rebranding', 'identity', 'naming',
  'packaging', 'ui-ux', 'print', 'motion', 'strategy',
] as const

type ServiceSlug = (typeof SERVICE_SLUGS)[number]

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

function isServiceSlug(s: string): s is ServiceSlug {
  return (SERVICE_SLUGS as readonly string[]).includes(s)
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
  return {
    title:       metaTitle,
    description: metaDesc,
    alternates:  localizedAlternates(params.locale, `services/${params.slug}`),
    openGraph:   { title: metaTitle, description: metaDesc, ...ogLocale(params.locale) },
    twitter:     { card: 'summary_large_image', title: metaTitle, description: metaDesc },
  }
}

export default async function ServiceClusterPage({ params }: Props) {
  if (!isServiceSlug(params.slug)) notFound()
  setRequestLocale(params.locale)
  const { locale, slug } = params

  const [tCluster, tLabels, tCommon, projects] = await Promise.all([
    getTranslations({ locale, namespace: `servicesPage.cluster.${slug}` }),
    getTranslations({ locale, namespace: 'servicesPage.cluster._labels' }),
    getTranslations({ locale, namespace: 'servicesPage' }),
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
      <header className="px-6 md:px-10 pb-14 border-b border-maze-border">
        <div className="max-w-[1440px] mx-auto">
          <Link
            href="/services"
            className="label-sm text-maze-muted hover:text-maze-lime transition-colors mb-8 inline-flex items-center gap-2"
          >
            ← {tLabels('back')}
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mt-6">
            <div>
              <p className="label-sm text-maze-lime mb-4">{tLabels('service')}</p>
              <TextReveal as="h1" stagger className="display-md text-maze-cream mb-4">{content.title}</TextReveal>
              <p className="heading-md text-maze-muted">{content.tagline}</p>
            </div>
            <div className="flex flex-col gap-4 lg:items-end lg:justify-end">
              <Link
                href={`/contact?service=${slug}`}
                className="inline-flex items-center gap-2 self-start lg:self-end px-6 py-3 bg-maze-lime text-maze-ink font-bold rounded-full label-sm hover:bg-maze-paper transition-colors"
              >
                {tLabels('cta')}
                <Arrow direction="up-right" className="text-base" />
              </Link>
              <Link
                href={`/portfolio/category/${slug}`}
                className="label-sm text-maze-muted hover:text-maze-cream transition-colors"
              >
                {tLabels('seePortfolio')} →
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
          <h2 className="display-md text-maze-cream mb-12 max-w-2xl">
            {tLabels('approach')}
          </h2>
          <ol className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
            {content.approach.map((step, i) => (
              <li key={i} className="flex gap-6">
                <span className="label-sm text-maze-lime tabular-nums shrink-0 mt-1">
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
                  <span className="w-1.5 h-1.5 rounded-full bg-maze-lime shrink-0 mt-3" />
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
            <div className="flex items-end justify-between gap-4 mb-10">
              <h2 className="display-md text-maze-cream">{tLabels('selectedWork')}</h2>
              <Link
                href={`/portfolio/category/${slug}`}
                className="label-sm text-maze-muted hover:text-maze-lime transition-colors whitespace-nowrap"
              >
                {tLabels('seePortfolio')} →
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {related.map((project) => {
                const title = isRu ? (project.titleRu || project.title) : project.title
                return (
                  <Link
                    key={project.id}
                    href={`/portfolio/${project.slug}`}
                    className="group block"
                    data-cursor="view"
                  >
                    <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-maze-gray mb-4">
                      {project.coverImage && (
                        <Image
                          src={project.coverImage}
                          alt={title}
                          fill
                          sizes="(max-width: 768px) 100vw, 33vw"
                          className="object-cover transition-transform duration-500 ease-out [@media(hover:hover)]:group-hover:scale-105"
                        />
                      )}
                    </div>
                    <h3 className="font-semibold text-maze-cream group-hover:text-maze-lime transition-colors">
                      {title}
                    </h3>
                    <p className="label-sm text-maze-muted mt-1">{project.client}</p>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="px-6 md:px-10 py-16 md:py-24 border-b border-maze-border">
        <div className="max-w-3xl mx-auto">
          <h2 className="display-md text-maze-cream mb-12">{tLabels('faq')}</h2>
          <div className="divide-y divide-maze-border border-y border-maze-border">
            {content.faq.map((item, i) => (
              <details key={i} className="group">
                <summary className="flex items-baseline justify-between gap-4 cursor-pointer py-5 list-none [&::-webkit-details-marker]:hidden">
                  <span className="heading-md text-maze-cream group-hover:text-maze-lime transition-colors">
                    {item.q}
                  </span>
                  <span
                    aria-hidden="true"
                    className="label-sm text-maze-muted shrink-0 transition-transform duration-200 group-open:rotate-45"
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

      {/* CTA */}
      <section className="px-6 md:px-10 py-24 text-center">
        <h2 className="display-md text-maze-cream mb-6">{tCommon('notSureHeading')}</h2>
        <p className="body-lg text-maze-muted max-w-md mx-auto mb-8">
          {tLabels('ctaBody', { service: content.title })}
        </p>
        <Link
          href={`/contact?service=${slug}`}
          className="inline-flex items-center gap-3 px-8 py-4 bg-maze-lime text-maze-ink font-bold rounded-full hover:bg-maze-paper transition-colors"
        >
          {tLabels('cta')} ↗
        </Link>
      </section>
    </article>
  )
}
