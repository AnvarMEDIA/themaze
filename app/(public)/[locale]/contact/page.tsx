import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { ContactForm } from '@/components/contact/ContactForm'
import { getSettings } from '@/lib/settings'
import { telegramHref, telegramDisplay } from '@/lib/utils'
import { JsonLd } from '@/components/JsonLd'
import { breadcrumbJsonLd, contactPageJsonLd, homeCrumb } from '@/lib/jsonLd'
import { localizedAlternates } from '@/lib/seo'

export const dynamic = 'force-dynamic'

interface Props {
  params: { locale: string }
}

export async function generateMetadata({ params: { locale } }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'contactPage' })
  return {
    title: t('metaTitle'),
    description: t('metaDesc'),
    alternates: localizedAlternates(locale, 'contact'),
  }
}


export default async function ContactPage({ params: { locale } }: Props) {
  setRequestLocale(locale)
  const [t, settings] = await Promise.all([
    getTranslations({ locale, namespace: 'contactPage' }),
    getSettings(),
  ])

  const email    = settings.email    || 'hello@maze.uz'
  const phone    = settings.phone    || '+998 99 999 99 99'
  const telegram = settings.telegram || '@mazestudio'
  const address  = settings.address  || 'Tashkent, Uzbekistan'

  const info = [
    { key: 'emailLabel',    value: email,                      href: `mailto:${email}` },
    { key: 'phoneLabel',    value: phone,                      href: `tel:${phone.replace(/\s/g, '')}` },
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
      <div className="px-6 md:px-10 py-16 md:py-24 border-b border-maze-border">
        <div className="max-w-[1440px] mx-auto">
          <p className="label-sm text-maze-muted mb-6">{t('label')}</p>
          <h1 className="display-md text-maze-cream max-w-2xl">{t('heading')}</h1>
        </div>
      </div>

      <div className="px-6 md:px-10 py-16 md:py-24">
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24">
          <div>
            <p className="body-lg text-maze-muted mb-10 max-w-md">{t('sub')}</p>

            <div className="space-y-6 mb-12">
              {info.map((item) => (
                <div key={item.key}>
                  <p className="label-sm text-maze-muted mb-1">{t(item.key)}</p>
                  {item.href ? (
                    <a
                      href={item.href}
                      className="body-lg text-maze-cream hover:text-maze-lime transition-colors"
                      target={item.href.startsWith('http') ? '_blank' : undefined}
                      rel="noopener noreferrer"
                    >
                      {item.value}
                    </a>
                  ) : (
                    <p className="body-lg text-maze-cream">{item.value}</p>
                  )}
                </div>
              ))}
            </div>

            <div>
              <p className="label-sm text-maze-muted mb-4">{t('followUs')}</p>
              <div className="flex flex-wrap gap-3">
                {displaySocials.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="label-sm px-4 py-2 border border-maze-border rounded-full text-maze-muted hover:border-maze-lime hover:text-maze-lime transition-all duration-200"
                  >
                    {s.label}
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div>
            <ContactForm />
          </div>
        </div>
      </div>
    </div>
  )
}
