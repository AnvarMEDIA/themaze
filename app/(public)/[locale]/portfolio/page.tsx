import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { routing } from '@/i18n/routing'
import { PortfolioGrid } from '@/components/portfolio/PortfolioGrid'
import { getAllProjects } from '@/lib/portfolio'

interface Props {
  params: { locale: string }
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({ params: { locale } }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'portfolio' })
  return {
    title: t('heading'),
    description:
      "Explore MAZE Studio's portfolio of brand identity, UI/UX design, print, and motion design projects across Uzbekistan and Central Asia.",
  }
}

export default async function PortfolioPage({ params: { locale } }: Props) {
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'portfolio' })
  const projects = getAllProjects()

  return (
    <div className="pt-28 pb-20 px-6 md:px-10 min-h-screen">
      <div className="max-w-[1440px] mx-auto">
        <div className="mb-16 border-b border-maze-border pb-10">
          <p className="label-sm text-maze-muted mb-4">{t('label')}</p>
          <h1 className="display-md text-maze-cream">{t('heading')}</h1>
        </div>
        <PortfolioGrid projects={projects} />
      </div>
    </div>
  )
}
