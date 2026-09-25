import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { Arrow } from '@/components/ui/Arrow'
import { SERVICE_SLUGS } from '@/lib/llms'
import { SectionHead } from './SectionHead'

const HOVER_LIME  = '[@media(hover:hover)_and_(pointer:fine)]:group-hover:text-maze-lime'
const HOVER_NUDGE = '[@media(hover:hover)_and_(pointer:fine)]:group-hover:translate-x-1'

/**
 * All nine services, each one row that is one link to its own page.
 *
 * The list used to be six hand-picked names that didn't match the site:
 * Packaging next to "Print & Packaging", and an Art Direction service with
 * no page, all pointing at anchors on /services. Names and taglines now
 * come from the service pages themselves, so the two can't drift apart,
 * and each row says how long the work takes — the first thing a prospect
 * asks after "what do you do".
 */
export function ServicesSection() {
  const t  = useTranslations('home.services')
  const tc = useTranslations('servicesPage.cluster')

  return (
    <section className="px-6 md:px-10 py-12 md:py-16">
      <div className="max-w-[1440px] mx-auto">
        <SectionHead title={t('heading')} link={{ href: '/services', label: t('all') }} />
        <ul>
          {SERVICE_SLUGS.map((slug) => (
            <li key={slug} className="border-b border-maze-border first:border-t">
              <Link
                href={`/services/${slug}`}
                className="group grid grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)_7.5rem_1rem] items-baseline gap-x-6 gap-y-1.5 py-5 md:py-6"
              >
                <h3 className={`heading-md text-maze-cream transition-colors duration-200 ${HOVER_LIME}`}>
                  {tc(`${slug}.title`)}
                </h3>
                <span className="md:order-3 font-mono text-xs text-maze-muted text-right whitespace-nowrap">
                  {t(`durations.${slug}`)}
                </span>
                <p className="col-span-2 md:col-span-1 md:order-2 text-maze-muted text-pretty">
                  {tc(`${slug}.tagline`)}
                </p>
                <Arrow
                  direction="right"
                  className={`hidden md:block md:order-4 text-maze-muted transition-transform duration-200 ease-out ${HOVER_NUDGE}`}
                />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
