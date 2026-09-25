import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { getTeam } from '@/lib/team'
import { getPartners } from '@/lib/partners'
import Image from 'next/image'
import { JsonLd } from '@/components/JsonLd'
import { aboutPageJsonLd, breadcrumbJsonLd, homeCrumb } from '@/lib/jsonLd'
import { pageMeta } from '@/lib/seo'
import { Trail } from '@/components/ui/Trail'
import { ClientsSection } from '@/components/home/ClientsSection'

interface Props {
  params: { locale: string }
}

export async function generateMetadata({ params: { locale } }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'aboutPage' })
  return pageMeta({
    locale,
    path: 'about',
    title: t('metaTitle'),
    description: t('metaDesc'),
  })
}

// The studio's figures, the same as on the homepage and never animated.
// "Founded" rather than a count of years, so the number is true every year.
const STATS = [
  { value: '2019', key: 'statsFounded' },
  { value: '200+', key: 'statsProjects' },
  { value: '80+',  key: 'statsClients' },
  { value: '12',   key: 'statsAwards' },
] as const

export const dynamic = 'force-dynamic'

export default async function AboutPage({ params: { locale } }: Props) {
  setRequestLocale(locale)
  const [t, tNav, team, partners] = await Promise.all([
    getTranslations({ locale, namespace: 'aboutPage' }),
    getTranslations({ locale, namespace: 'nav' }),
    getTeam().catch(() => [] as import('@/lib/team').TeamMember[]),
    getPartners().catch(() => []),
  ])
  const values = t.raw('values') as { title: string; body: string }[]

  const isRu   = locale === 'ru'
  const crumbs = breadcrumbJsonLd([
    homeCrumb(locale, isRu ? 'Главная' : 'Home'),
    { name: isRu ? 'О нас' : 'About', url: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.maze.uz'}${locale === 'en' ? '' : '/' + locale}/about` },
  ])

  return (
    <div className="pt-28">
      <JsonLd data={[crumbs, aboutPageJsonLd(team, locale)]} />
      {/* Hero */}
      <div className="px-6 md:px-10 pt-10 md:pt-14 pb-14 md:pb-20">
        <div className="max-w-[1440px] mx-auto">
          <Trail steps={[{ label: tNav('about') }]} />
          <h1 className="display-md text-maze-cream max-w-4xl mb-8 text-balance">{t('heroHeading')}</h1>
          <p className="body-lg text-maze-muted max-w-2xl text-pretty">{t('heroSub')}</p>
        </div>
      </div>

      {/* Figures */}
      <div className="px-6 md:px-10">
        <dl className="max-w-[1440px] mx-auto grid grid-cols-2 md:grid-cols-4 border-t border-maze-border">
          {STATS.map(({ value, key }) => (
            <div key={key} className="flex flex-col-reverse gap-1.5 py-6 md:py-8 pr-4">
              <dt className="text-sm text-maze-muted">{t(key)}</dt>
              <dd className="text-[clamp(1.75rem,3vw,2.75rem)] font-bold leading-none tracking-[-0.02em] text-maze-cream tabular-nums">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Story + Values */}
      <div className="px-6 md:px-10 py-16 md:py-24">
        <div className="max-w-[1440px] mx-auto border-t border-maze-border pt-6 grid grid-cols-1 lg:grid-cols-12 gap-x-10 gap-y-14">
          <div className="lg:col-span-6">
            <h2 className="heading-lg text-maze-cream mb-6">{t('storyHeading')}</h2>
            <div className="space-y-5 body-lg text-maze-muted max-w-xl">
              <p>{t('story1')}</p>
              <p>{t('story2')}</p>
              <p>{t('story3')}</p>
            </div>
          </div>
          <div className="lg:col-span-5 lg:col-start-8">
            <h2 className="heading-lg text-maze-cream mb-6">{t('valuesHeading')}</h2>
            <dl className="border-t border-maze-border">
              {values.map((v, i) => (
                <div key={i} className="py-5 border-b border-maze-border">
                  <dt className="font-semibold text-maze-cream mb-1.5">{v.title}</dt>
                  <dd className="text-maze-muted">{v.body}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      {/* Team */}
      {team.length > 0 && (
        <div className="px-6 md:px-10 pb-16 md:pb-24">
          <div className="max-w-[1440px] mx-auto border-t border-maze-border pt-6">
            <h2 className="heading-lg text-maze-cream mb-10 md:mb-12">{t('teamHeading')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-10">
              {team.map((member) => {
                const role = locale === 'ru' && member.roleRu ? member.roleRu : member.role
                const bio  = locale === 'ru' && member.bioRu  ? member.bioRu  : member.bio
                const initials = member.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
                return (
                  <div key={member.id}>
                    <div className="aspect-square rounded-sm bg-maze-dark mb-5 overflow-hidden relative">
                      {member.photo ? (
                        <Image
                          src={member.photo}
                          alt={member.name}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-4xl font-extrabold text-maze-muted">{initials}</span>
                        </div>
                      )}
                    </div>
                    <h3 className="font-semibold text-maze-cream">{member.name}</h3>
                    <p className="text-sm text-maze-muted mt-0.5 mb-3">{role}</p>
                    <p className="text-maze-muted text-pretty">{bio}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Clients — the studio's real list from the admin, set the same way
          as on the homepage. This used to be twelve names typed into the
          page, half of them the sample projects the site shipped with. */}
      <ClientsSection heading={t('trustedBy')} partners={partners} testimonials={[]} locale={locale} />
    </div>
  )
}
