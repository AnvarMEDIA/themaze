import { setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { routing } from '@/i18n/routing'
import { PublicShell } from '@/components/layout/PublicShell'

interface Props {
  children: React.ReactNode
  params: { locale: string }
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = params

  if (!routing.locales.includes(locale as 'en' | 'ru')) {
    notFound()
  }

  setRequestLocale(locale)

  return <PublicShell locale={locale}>{children}</PublicShell>
}
