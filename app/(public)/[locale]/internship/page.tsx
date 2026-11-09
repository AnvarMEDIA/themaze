import type { Metadata } from 'next'
import { setRequestLocale, getTranslations } from 'next-intl/server'
import { routing } from '@/i18n/routing'
import { Link } from '@/i18n/navigation'
import { JsonLd } from '@/components/JsonLd'
import { Reveal } from '@/components/ui/Reveal'
import { TextReveal } from '@/components/ui/TextReveal'
import { Arrow } from '@/components/ui/Arrow'
import { ApplyLink } from '@/components/internship/ApplyLink'
import { InternshipForm } from '@/components/internship/InternshipForm'
import { breadcrumbJsonLd, homeCrumb, internshipJsonLd } from '@/lib/jsonLd'
import { pageMeta, SITE_URL } from '@/lib/seo'
import { getInternshipSettings } from '@/lib/internshipStore'
import { getSettings } from '@/lib/settings'

interface Props {
  params: { locale: string }
}

interface Fact { label: string; value: string }
interface Item { title: string; body: string }

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({ params: { locale } }: Props): Promise<Metadata> {
  const [t, internship] = await Promise.all([
    getTranslations({ locale, namespace: 'internship' }),
    getInternshipSettings(),
  ])
  return pageMeta({
    locale,
    path: 'internship',
    title: t('metaTitle'),
    description: t('metaDesc'),
    // A closed intake stays reachable for the links that point at it, but a
    // page about something nobody can do right now is not offered to search.
    robots: { index: internship.open, follow: true },
  })
}

export default async function InternshipPage({ params: { locale } }: Props) {
  setRequestLocale(locale)
  const [t, internship, settings] = await Promise.all([
    getTranslations({ locale, namespace: 'internship' }),
    getInternshipSettings(),
    getSettings(),
  ])
  const open = internship.open

  const facts = t.raw('facts') as Fact[]
  const tasks = t.raw('do') as Item[]
  const look  = t.raw('look') as string[]
  const steps = t.raw('steps') as Item[]

  const homeLabel = locale === 'ru' ? 'Главная' : 'Home'
  const crumbs = breadcrumbJsonLd([
    homeCrumb(locale, homeLabel),
    { name: t('label'), url: `${SITE_URL}${locale === 'en' ? '' : '/' + locale}/internship` },
  ])

  const job = open
    ? internshipJsonLd({
        locale,
        title: t('jobTitle'),
        intro: t('sub'),
        sections: [
          { heading: t('doHeading'),    items: tasks.map((i) => `${i.title}: ${i.body}`) },
          { heading: t('lookHeading'),  items: look },
          { heading: t('label'),        items: facts.map((f) => `${f.label}: ${f.value}`) },
          { heading: t('stepsHeading'), items: steps.map((s) => `${s.title}: ${s.body}`) },
        ],
        datePosted: internship.openedAt,
        settings,
      })
    : null

  return (
    <div className="pt-28">
      <JsonLd data={crumbs} />
      {job && <JsonLd id="ld-job" data={job} />}

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="px-6 md:px-10 pt-12 md:pt-20 pb-16 md:pb-24 border-b border-maze-border">
        <div className="max-w-[1440px] mx-auto">
          <p className="label-sm text-maze-muted mb-6 flex flex-wrap items-center gap-x-3 gap-y-2">
            <span>{t('label')}</span>
            <span aria-hidden="true" className="w-6 h-px bg-maze-border" />
            <span className={open ? 'inline-flex items-center gap-2 text-maze-cream' : ''}>
              {open && <span aria-hidden="true" className="intern-live" />}
              {open ? t('statusOpen') : t('statusClosed')}
            </span>
          </p>
          <TextReveal as="h1" stagger className="display-lg text-maze-cream mb-8">{t('heading')}</TextReveal>
          <p className="body-lg text-maze-muted max-w-2xl mb-10">{t('sub')}</p>
          {open && <ApplyLink label={t('apply')} />}

          <dl className="mt-16 md:mt-24 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-8">
            {facts.map((f, i) => (
              <Reveal key={f.label} delay={i * 0.06} y={14} className="border-t border-maze-border pt-5">
                <dt className="label-sm text-maze-muted mb-3">{f.label}</dt>
                <dd className="text-xl md:text-2xl font-semibold leading-snug tracking-tight text-maze-cream">{f.value}</dd>
              </Reveal>
            ))}
          </dl>
        </div>
      </section>

      {/* ── What you'll do / who we look for ─────────────────────────────── */}
      <section className="px-6 md:px-10 py-20 md:py-32 border-b border-maze-border">
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24">
          <div>
            <Reveal><h2 className="heading-lg text-maze-cream mb-10">{t('doHeading')}</h2></Reveal>
            <ol>
              {tasks.map((item, i) => (
                <Reveal
                  key={item.title} as="li" delay={i * 0.06} y={14}
                  className="grid grid-cols-[2.5rem_1fr] gap-4 py-6 border-t border-maze-border"
                >
                  <span className="label-sm text-maze-muted pt-1 tabular-nums">0{i + 1}</span>
                  <div>
                    <h3 className="text-lg md:text-xl font-semibold text-maze-cream mb-1.5">{item.title}</h3>
                    <p className="body-lg text-maze-muted">{item.body}</p>
                  </div>
                </Reveal>
              ))}
            </ol>
          </div>

          <div>
            <Reveal><h2 className="heading-lg text-maze-cream mb-10">{t('lookHeading')}</h2></Reveal>
            <ul>
              {look.map((line, i) => (
                <Reveal
                  key={line} as="li" delay={i * 0.06} y={14}
                  className="flex items-start gap-4 py-5 border-t border-maze-border"
                >
                  <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="w-4 h-4 mt-1.5 shrink-0 text-maze-cream">
                    <path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="body-lg text-maze-cream">{line}</span>
                </Reveal>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── Selection ────────────────────────────────────────────────────── */}
      <section className="px-6 md:px-10 py-20 md:py-32 border-b border-maze-border bg-maze-dark">
        <div className="max-w-[1440px] mx-auto">
          <Reveal>
            <p className="label-sm text-maze-muted mb-4">{t('stepsLabel')}</p>
            <h2 className="heading-lg text-maze-cream mb-12 md:mb-16">{t('stepsHeading')}</h2>
          </Reveal>
          <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0.5">
            {steps.map((step, i) => (
              <Reveal
                key={step.title} as="li" delay={i * 0.06} y={20}
                className="bg-maze-gray p-8 flex flex-col"
              >
                <span className="label-sm text-maze-lime mb-6 tabular-nums">0{i + 1}</span>
                <h3 className="heading-md text-maze-cream mb-3">{step.title}</h3>
                <p className="body-lg text-maze-muted">{step.body}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Apply ────────────────────────────────────────────────────────── */}
      <section id="apply" className="scroll-mt-24 px-6 md:px-10 py-20 md:py-32">
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          {open ? (
            <>
              <div className="lg:col-span-5">
                <div className="lg:sticky lg:top-32">
                  <Reveal>
                    <h2 className="display-md text-maze-cream mb-6">{t('form.heading')}</h2>
                    <p className="body-lg text-maze-muted max-w-md">{t('form.sub')}</p>
                  </Reveal>
                </div>
              </div>
              <div className="lg:col-span-7">
                <InternshipForm />
              </div>
            </>
          ) : (
            <div className="lg:col-span-8">
              <Reveal>
                <h2 className="display-md text-maze-cream mb-6">{t('closed.heading')}</h2>
                <p className="body-lg text-maze-muted max-w-xl mb-10">{t('closed.body')}</p>
                <Link
                  href="/portfolio"
                  className="group inline-flex items-center gap-3 px-8 py-4 bg-maze-lime text-maze-ink font-bold rounded-full transition-[background-color,transform] duration-150 ease-out active:scale-[0.97] [@media(hover:hover)_and_(pointer:fine)]:hover:bg-maze-paper"
                >
                  {t('closed.cta')}
                  <Arrow direction="up-right" className="text-base transition-transform duration-200 ease-out [@media(hover:hover)_and_(pointer:fine)]:group-hover:translate-x-0.5 [@media(hover:hover)_and_(pointer:fine)]:group-hover:-translate-y-0.5" />
                </Link>
              </Reveal>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
