import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { routing } from '@/i18n/routing'
import { Link } from '@/i18n/navigation'
import { JsonLd } from '@/components/JsonLd'
import { breadcrumbJsonLd, servicesJsonLd, faqJsonLd, homeCrumb } from '@/lib/jsonLd'
import { pageMeta } from '@/lib/seo'
import { Trail } from '@/components/ui/Trail'
import { Arrow } from '@/components/ui/Arrow'
import { SERVICE_SLUGS } from '@/lib/services'

interface Props {
  params: { locale: string }
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({ params: { locale } }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'servicesPage' })
  return pageMeta({
    locale,
    path: 'services',
    title: t('metaTitle'),
    description: t('metaDesc'),
  })
}

interface Cluster {
  title:           string
  tagline:         string
  metaDescription: string
  deliverables:    string[]
}

/**
 * Every service, from the pages that describe them.
 *
 * This list used to be its own copy: six entries, one of them "Print &
 * Packaging" beside Packaging, one an Art Direction service whose "Learn
 * more" led to a 404, and four real service pages (Rebranding, UI/UX,
 * Motion, Strategy) that nothing here linked to. Each service also wore a
 * different accent colour. It is now built from the nine service pages
 * themselves — the same names, taglines and deliverables — so the index
 * and the pages cannot disagree, and the structured data describes pages
 * that exist.
 */
export default async function ServicesPage({ params: { locale } }: Props) {
  setRequestLocale(locale)
  const [t, tNav, tHome] = await Promise.all([
    getTranslations({ locale, namespace: 'servicesPage' }),
    getTranslations({ locale, namespace: 'nav' }),
    getTranslations({ locale, namespace: 'home.services' }),
  ])
  const cluster  = t.raw('cluster') as Record<string, Cluster>
  const services = SERVICE_SLUGS.map((slug) => ({ slug, ...cluster[slug] }))
  const faqItems = (t.raw('faqItems') as Array<{ q: string; a: string }> | undefined) ?? []

  const isRu   = locale === 'ru'
  const crumbs = breadcrumbJsonLd([
    homeCrumb(locale, isRu ? 'Главная' : 'Home'),
    { name: isRu ? 'Услуги' : 'Services', url: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.maze.uz'}${locale === 'en' ? '' : '/' + locale}/services` },
  ])
  const servicesLd = servicesJsonLd(
    services.map((s) => ({ id: s.slug, name: s.title, description: s.metaDescription })),
    locale,
  )

  return (
    <div className="pt-28 min-h-screen">
      <JsonLd
        data={[crumbs, servicesLd, ...(faqItems.length ? [faqJsonLd(faqItems.map((it) => ({ question: it.q, answer: it.a })), locale)] : [])]}
      />
      <header className="px-6 md:px-10 pt-10 md:pt-14 pb-14 md:pb-20">
        <div className="max-w-[1440px] mx-auto">
          <Trail steps={[{ label: tNav('services') }]} />
          <h1 className="display-md text-maze-cream max-w-4xl text-balance">{t('heroHeading')}</h1>
          <p className="mt-8 body-lg text-maze-muted max-w-2xl text-pretty">{t('heroSub')}</p>
        </div>
      </header>

      <section className="px-6 md:px-10 pb-16 md:pb-24">
        <ol className="max-w-[1440px] mx-auto border-t border-maze-border">
          {services.map((s) => (
            <li
              key={s.slug}
              id={s.slug}
              className="scroll-mt-28 border-b border-maze-border py-10 md:py-14 grid grid-cols-1 lg:grid-cols-12 gap-x-10 gap-y-6"
            >
              <div className="lg:col-span-5">
                <h2 className="heading-lg text-maze-cream">
                  <Link
                    href={`/services/${s.slug}`}
                    className="transition-colors duration-200 [@media(hover:hover)_and_(pointer:fine)]:hover:text-maze-lime"
                  >
                    {s.title}
                  </Link>
                </h2>
                <p className="mt-3 heading-md text-maze-muted text-pretty">{s.tagline}</p>
                <p className="mt-5 font-mono text-xs text-maze-muted">{tHome(`durations.${s.slug}`)}</p>
              </div>
              <div className="lg:col-span-7">
                <p className="body-lg text-maze-muted text-pretty">{s.metaDescription}</p>
                <h3 className="mt-7 mb-3 font-mono text-[11px] uppercase tracking-[0.12em] text-maze-muted">
                  {t('whatYouGet')}
                </h3>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                  {s.deliverables.slice(0, 6).map((d) => (
                    <li key={d} className="flex gap-3 text-maze-cream">
                      <span aria-hidden="true" className="mt-[0.6em] w-1.5 h-1.5 bg-maze-muted shrink-0" />
                      {d}
                    </li>
                  ))}
                </ul>
                <div className="mt-7 flex flex-wrap items-center gap-x-7">
                  <Link
                    href={`/services/${s.slug}`}
                    aria-label={`${s.title} — ${t('learnMore')}`}
                    className="link-arrow"
                  >
                    {t('learnMore')}
                    <Arrow direction="right" className="text-base" />
                  </Link>
                  <Link
                    href={`/contact?service=${s.slug}`}
                    aria-label={`${s.title} — ${t('enquire')}`}
                    className="link-arrow link-arrow-quiet"
                  >
                    {t('enquire')}
                    <Arrow direction="right" className="text-base" />
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* FAQ — answers common pre-sales questions and earns the
          FAQPage rich result in Google. */}
      {faqItems.length > 0 && (
        <section className="px-6 md:px-10 pb-16 md:pb-24">
          <div className="max-w-3xl mx-auto">
            <h2 className="heading-lg text-maze-cream mb-10">{t('faqHeading')}</h2>
            <div className="divide-y divide-maze-border border-y border-maze-border">
              {faqItems.map((item, i) => (
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
                  <p className="body-lg text-maze-muted pb-6 max-w-2xl">
                    {item.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
