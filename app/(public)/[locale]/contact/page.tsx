import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { routing } from '@/i18n/routing'
import { ContactForm } from '@/components/contact/ContactForm'

interface Props {
  params: { locale: string }
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({ params: { locale } }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'contactPage' })
  return {
    title: t('metaTitle'),
    description: t('metaDesc'),
  }
}

const info = [
  { key: 'emailLabel',    value: 'hello@maze.uz',       href: 'mailto:hello@maze.uz' },
  { key: 'phoneLabel',    value: '+998 99 999 99 99',    href: 'tel:+998999999999' },
  { key: 'telegramLabel', value: '@mazestudio',           href: 'https://t.me/mazestudio' },
  { key: 'locationLabel', value: 'Tashkent, Uzbekistan', href: null },
] as const

const socials = [
  { label: 'Instagram', href: 'https://instagram.com/mazestudio' },
  { label: 'Behance',   href: 'https://behance.net/mazestudio' },
  { label: 'LinkedIn',  href: 'https://linkedin.com/company/mazestudio' },
  { label: 'Dribbble',  href: 'https://dribbble.com/mazestudio' },
]

export default async function ContactPage({ params: { locale } }: Props) {
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'contactPage' })

  return (
    <div className="pt-28 min-h-screen">
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
              <div className="flex gap-4">
                {socials.map((s) => (
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
