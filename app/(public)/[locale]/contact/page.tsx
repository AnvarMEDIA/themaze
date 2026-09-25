import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { ContactForm } from '@/components/contact/ContactForm'
import { getSettings } from '@/lib/settings'
import { telegramHref, telegramDisplay } from '@/lib/utils'
import { JsonLd } from '@/components/JsonLd'
import { breadcrumbJsonLd, contactPageJsonLd, homeCrumb } from '@/lib/jsonLd'
import { pageMeta } from '@/lib/seo'
import { Trail } from '@/components/ui/Trail'
import { Arrow } from '@/components/ui/Arrow'

export const dynamic = 'force-dynamic'

interface Props {
  params: { locale: string }
  searchParams?: { service?: string | string[] }
}

export async function generateMetadata({ params: { locale } }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'contactPage' })
  return pageMeta({
    locale,
    path: 'contact',
    title: t('metaTitle'),
    description: t('metaDesc'),
  })
}


export default async function ContactPage({ params: { locale }, searchParams }: Props) {
  setRequestLocale(locale)
  const [t, tNav, settings] = await Promise.all([
    getTranslations({ locale, namespace: 'contactPage' }),
    getTranslations({ locale, namespace: 'nav' }),
    getSettings(),
  ])
  const askedFor = typeof searchParams?.service === 'string' ? searchParams.service : undefined

  const email    = settings.email    || 'hello@maze.uz'
  // No invented fallback number: with no phone in Settings the row is left
  // out rather than offering a stranger's line as the studio's.
  const phone    = settings.phone
  const telegram = settings.telegram || '@mazestudio'
  const address  = settings.address  || 'Tashkent, Uzbekistan'

  const info = [
    { key: 'emailLabel',    value: email,                      href: `mailto:${email}` },
    ...(phone ? [{ key: 'phoneLabel', value: phone, href: `tel:${phone.replace(/\s/g, '')}` }] : []),
    { key: 'telegramLabel', value: telegramDisplay(telegram),  href: telegramHref(telegram) },
    { key: 'locationLabel', value: address,                    href: null },
  ]

  const socials = [
    settings.instagram && { label: 'Instagram', href: settings.instagram },
    settings.behance   && { label: 'Behance',   href: settings.behance   },
    settings.linkedin  && { label: 'LinkedIn',  href: settings.linkedin  },
    settings.telegram  && { label: 'Telegram',  href: telegramHref(telegram) },
    settings.twitter   && { label: 'Twitter / X', href: settings.twitter },
  ].filter(Boolean) as { label: string; href: string }[]

  // Fallback if no settings configured
  const displaySocials = socials.length > 0 ? socials : [
    { label: 'Instagram', href: 'https://instagram.com/mazestudio' },
    { label: 'Behance',   href: 'https://behance.net/mazestudio' },
    { label: 'LinkedIn',  href: 'https://linkedin.com/company/mazestudio' },
  ]

  const isRu   = locale === 'ru'
  const crumbs = breadcrumbJsonLd([
    homeCrumb(locale, isRu ? 'Главная' : 'Home'),
    { name: isRu ? 'Контакты' : 'Contact', url: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.maze.uz'}${locale === 'en' ? '' : '/' + locale}/contact` },
  ])

  return (
    <div className="pt-28 min-h-screen">
      <JsonLd data={[crumbs, contactPageJsonLd(locale)]} />
      <div className="px-6 md:px-10 pt-10 md:pt-14 pb-14 md:pb-20 border-b border-maze-border">
        <div className="max-w-[1440px] mx-auto">
          <Trail steps={[{ label: tNav('contact') }]} />
          <h1 className="display-md text-maze-cream max-w-3xl text-balance">{t('heading')}</h1>
        </div>
      </div>

      <div className="px-6 md:px-10 py-16 md:py-24">
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24">
          <div>
            <p className="body-lg text-maze-muted mb-10 max-w-md text-pretty">{t('sub')}</p>

            {/* Contact methods */}
            <div className="border-t border-maze-border mb-12">
              {info.map((item) => {
                const body = (
                  <>
                    <div className="flex items-baseline gap-4 min-w-0">
                      <div className="min-w-0">
                        <p className="font-mono text-xs text-maze-muted mb-1">{t(item.key)}</p>
                        <span className="body-lg text-maze-cream break-words transition-colors [@media(hover:hover)_and_(pointer:fine)]:group-hover:text-maze-lime">
                          {item.value}
                        </span>
                      </div>
                    </div>
                    {item.href && (
                      <Arrow
                        direction="up-right"
                        className="text-lg text-maze-muted transition-transform duration-200 [@media(hover:hover)_and_(pointer:fine)]:group-hover:text-maze-lime [@media(hover:hover)_and_(pointer:fine)]:group-hover:translate-x-1 [@media(hover:hover)_and_(pointer:fine)]:group-hover:-translate-y-1"
                      />
                    )}
                  </>
                )
                return (
                  <div key={item.key}>
                    {item.href ? (
                      <a
                        href={item.href}
                        target={item.href.startsWith('http') ? '_blank' : undefined}
                        rel="noopener noreferrer"
                        className="group flex items-center justify-between gap-6 py-5 border-b border-maze-border"
                      >
                        {body}
                      </a>
                    ) : (
                      <div className="flex items-center justify-between gap-6 py-5 border-b border-maze-border">
                        {body}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div>
              <p className="font-mono text-xs text-maze-muted mb-4">{t('followUs')}</p>
              <div className="flex flex-wrap gap-3">
                {displaySocials.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="label-sm px-4 py-2 border border-maze-border rounded-full text-maze-muted hover:border-maze-lime hover:text-maze-lime transition-all duration-200 active:scale-[0.97]"
                  >
                    {s.label}
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Present from the first frame: this is what the page is for. */}
          <ContactForm initialService={askedFor} />
        </div>
      </div>
    </div>
  )
}
