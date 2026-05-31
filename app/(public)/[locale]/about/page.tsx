import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import { Link } from '@/i18n/navigation'
import { getTeam } from '@/lib/team'
import Image from 'next/image'
import { JsonLd } from '@/components/JsonLd'
import { aboutPageJsonLd, breadcrumbJsonLd, homeCrumb } from '@/lib/jsonLd'
import { localizedAlternates } from '@/lib/seo'
import { getSettings } from '@/lib/settings'

interface Props {
  params: { locale: string }
}

export async function generateMetadata({ params: { locale } }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'aboutPage' })
  return {
    title: t('metaTitle'),
    description: t('metaDesc'),
    alternates: localizedAlternates(locale, 'about'),
  }
}

const clients = [
  'Hilol', 'UzPay', 'Samarkand Heritage', 'Palov House',
  'TechUZ', 'Anor Winery', 'UzAir', 'Asaka Motors',
  'Tashkent University', 'Silk Road Hotels', 'Green Energy UZ', 'Moliya Bank',
]

export const dynamic = 'force-dynamic'

export default async function AboutPage({ params: { locale } }: Props) {
  setRequestLocale(locale)
  const [t, team, settings] = await Promise.all([
    getTranslations({ locale, namespace: 'aboutPage' }),
    getTeam().catch(() => [] as import('@/lib/team').TeamMember[]),
    getSettings(),
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
      <div className="px-6 md:px-10 py-20 border-b border-maze-border">
        <div className="max-w-[1440px] mx-auto">
          <p className="label-sm text-maze-muted mb-6">{t('heroLabel')}</p>
          <h1 className="display-md text-maze-cream max-w-3xl mb-8">{t('heroHeading')}</h1>
          <p className="body-lg text-maze-muted max-w-2xl">{t('heroSub')}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="px-6 md:px-10 py-16 border-b border-maze-border bg-maze-dark">
        <div className="max-w-[1440px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { end: 6,   suffix: '+', label: t('statsYears') },
            { end: 200, suffix: '+', label: t('statsProjects') },
            { end: 80,  suffix: '+', label: t('statsClients') },
            { end: 12,  suffix: '',  label: t('statsAwards') },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="display-md text-maze-lime font-black">
                <AnimatedCounter end={s.end} suffix={s.suffix} />
              </div>
              <p className="label-sm text-maze-muted mt-2">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Story + Values */}
      <div className="px-6 md:px-10 py-20 md:py-32 border-b border-maze-border">
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16">
          <div>
            <h2 className="heading-lg text-maze-cream mb-6">{t('storyHeading')}</h2>
            <div className="space-y-5 body-lg text-maze-muted">
              <p>{t('story1')}</p>
              <p>{t('story2')}</p>
              <p>{t('story3')}</p>
            </div>
          </div>
          <div className="space-y-4">
            <h2 className="heading-lg text-maze-cream mb-6">{t('valuesHeading')}</h2>
            {values.map((v, i) => (
              <div key={i} className="p-5 border border-maze-border rounded-xl hover:border-maze-lime transition-colors group">
                <h3 className="font-semibold text-maze-cream group-hover:text-maze-lime transition-colors mb-1.5">
                  {v.title}
                </h3>
                <p className="body-lg text-maze-muted">{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Team */}
      <div className="px-6 md:px-10 py-20 md:py-32 border-b border-maze-border">
        <div className="max-w-[1440px] mx-auto">
          <h2 className="heading-lg text-maze-cream mb-12">{t('teamHeading')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {team.map((member) => {
              const role = locale === 'uz' ? (member.roleUz?.trim() || member.roleRu || member.role)
                         : locale === 'ru' ? (member.roleRu || member.role)
                         : member.role
              const bio  = locale === 'uz' ? (member.bioUz?.trim()  || member.bioRu  || member.bio)
                         : locale === 'ru' ? (member.bioRu  || member.bio)
                         : member.bio
              const initials = member.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
              return (
                <div key={member.id} className="group">
                  <div className="aspect-square rounded-xl bg-maze-dark border border-maze-border mb-5 overflow-hidden transition-colors duration-200 [@media(hover:hover)]:group-hover:border-maze-lime relative">
                    {member.photo ? (
                      <Image
                        src={member.photo}
                        alt={member.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-4xl font-black text-maze-muted">{initials}</span>
                      </div>
                    )}
                  </div>
                  <h3 className="font-semibold text-maze-cream">{member.name}</h3>
                  <p className="label-sm text-maze-lime mt-0.5 mb-2">{role}</p>
                  <p className="body-lg text-maze-muted">{bio}</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Clients — only shown when the partners block is enabled in admin */}
      {settings.partnersVisible && (
        <div className="px-6 md:px-10 py-20 border-b border-maze-border">
          <div className="max-w-[1440px] mx-auto">
            <p className="label-sm text-maze-muted mb-8">{t('trustedBy')}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {clients.map((client) => (
                <div
                  key={client}
                  className="h-14 flex items-center justify-center border border-maze-border rounded-lg text-maze-muted label-sm hover:border-maze-lime hover:text-maze-cream transition-all duration-200"
                >
                  {client}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="px-6 md:px-10 py-20 text-center">
        <h2 className="display-md text-maze-cream mb-6">{t('readyLabel')}</h2>
        <Link
          href="/contact"
          className="inline-flex items-center gap-3 px-8 py-4 bg-maze-lime text-maze-ink font-bold rounded-full hover:bg-maze-paper transition-colors"
        >
          {t('readyCta')} ↗
        </Link>
      </div>
    </div>
  )
}
