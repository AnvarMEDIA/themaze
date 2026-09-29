import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { routing } from '@/i18n/routing'
import { Link } from '@/i18n/navigation'
import { JsonLd } from '@/components/JsonLd'
import { breadcrumbJsonLd, servicesJsonLd, faqJsonLd, homeCrumb } from '@/lib/jsonLd'
import { pageMeta } from '@/lib/seo'
import { TextReveal } from '@/components/ui/TextReveal'

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

const accentColors = ['#C8FF47', '#4B6EF5', '#D4A017', '#06D6A0', '#FF4D1C', '#FF9E00', '#B47AEA']

export default async function ServicesPage({ params: { locale } }: Props) {
  setRequestLocale(locale)
  const t        = await getTranslations({ locale, namespace: 'servicesPage' })
  const services = t.raw('services') as {
    id: string; num: string; title: string; tagline: string; body: string; deliverables: string[]
  }[]
  const faqItems = (t.raw('faqItems') as Array<{ q: string; a: string }> | undefined) ?? []

  const isRu   = locale === 'ru'
  const crumbs = breadcrumbJsonLd([
    homeCrumb(locale, isRu ? 'Главная' : 'Home'),
    { name: isRu ? 'Услуги' : 'Services', url: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.maze.uz'}${locale === 'en' ? '' : '/' + locale}/services` },
  ])
  const servicesLd = servicesJsonLd(
    services.map((s) => ({ id: s.id, name: s.title, description: s.body })),
    locale,
  )

  return (
    <div className="pt-28 min-h-screen">
      <JsonLd
        data={[crumbs, servicesLd, ...(faqItems.length ? [faqJsonLd(faqItems.map((it) => ({ question: it.q, answer: it.a })), locale)] : [])]}
      />
      {/* Header */}
      <div className="px-6 md:px-10 py-20 border-b border-maze-border">
        <div className="max-w-[1440px] mx-auto">
          <p className="label-sm text-maze-muted mb-6">{t('heroLabel')}</p>
          <TextReveal as="h1" stagger className="display-md text-maze-cream max-w-2xl mb-8">{t('heroHeading')}</TextReveal>
          <p className="body-lg text-maze-muted max-w-xl">{t('heroSub')}</p>
        </div>
      </div>

      {/* Services */}
      <div className="px-6 md:px-10">
        <div className="max-w-[1440px] mx-auto">
          {services.map((service, i) => {
            const accent = accentColors[i % accentColors.length]
            return (
              <div
                key={service.id}
                id={service.id}
                className="py-16 md:py-24 border-b border-maze-border grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24"
              >
                <div>
                  <div className="flex items-center gap-4 mb-6">
                    <span className="label-sm font-bold" style={{ color: accent }}>
                      {service.num}
                    </span>
                    <div className="h-px flex-1" style={{ background: accent + '33' }} />
                  </div>
                  <h2 className="heading-lg text-maze-cream mb-3">{service.title}</h2>
                  <p className="heading-md mb-6" style={{ color: accent }}>{service.tagline}</p>
                  <p className="body-lg text-maze-muted">{service.body}</p>
                </div>

                <div>
                  <p className="label-sm text-maze-muted mb-5">{t('whatYouGet')}</p>
                  <ul className="space-y-3">
                    {service.deliverables.map((d) => (
                      <li key={d} className="flex items-center gap-3">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: accent }} />
                        <span className="body-lg text-maze-cream">{d}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-10 flex flex-wrap gap-3">
                    <Link
                      href={`/services/${service.id}`}
                      className="inline-flex items-center gap-2 label-sm px-5 py-3 border border-maze-lime/40 rounded-full text-maze-lime hover:bg-maze-lime hover:text-maze-ink transition-all duration-300"
                    >
                      {t('learnMore') ?? 'Learn more'} →
                    </Link>
                    <Link
                      href={`/contact?service=${service.id}`}
                      className="inline-flex items-center gap-2 label-sm px-5 py-3 border border-maze-border rounded-full text-maze-muted hover:border-maze-cream hover:text-maze-cream transition-all duration-300"
                    >
                      {t('enquire')} →
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* FAQ — answers common pre-sales questions and earns the
          FAQPage rich result in Google. */}
      {faqItems.length > 0 && (
        <section className="px-6 md:px-10 py-24 border-t border-maze-border">
          <div className="max-w-3xl mx-auto">
            <p className="label-sm text-maze-muted mb-4">{t('faqLabel')}</p>
            <h2 className="display-md text-maze-cream mb-12">{t('faqHeading')}</h2>
            <div className="divide-y divide-maze-border border-y border-maze-border">
              {faqItems.map((item, i) => (
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
                  <p className="body-lg text-maze-muted pb-6 max-w-2xl">
                    {item.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <div className="px-6 md:px-10 py-24 text-center">
        <p className="label-sm text-maze-muted mb-4">{t('notSureLabel')}</p>
        <h2 className="display-md text-maze-cream mb-6">{t('notSureHeading')}</h2>
        <p className="body-lg text-maze-muted max-w-md mx-auto mb-8">{t('notSureSub')}</p>
        <Link
          href="/contact"
          className="inline-flex items-center gap-3 px-8 py-4 bg-maze-lime text-maze-ink font-bold rounded-full hover:bg-maze-paper transition-colors"
        >
          {t('notSureCta')} ↗
        </Link>
      </div>
    </div>
  )
}
