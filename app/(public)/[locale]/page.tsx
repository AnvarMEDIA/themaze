import { setRequestLocale, getTranslations } from 'next-intl/server'
import { routing } from '@/i18n/routing'
import { Hero }            from '@/components/home/Hero'
import { Marquee }         from '@/components/home/Marquee'
import { FeaturedWork }    from '@/components/home/FeaturedWork'
import { AboutSection }    from '@/components/home/AboutSection'
import { ServicesSection } from '@/components/home/ServicesSection'
import { ProcessSection }  from '@/components/home/ProcessSection'
import { CTASection }      from '@/components/home/CTASection'
import { PartnersSection } from '@/components/home/PartnersSection'
import { getAllProjects } from '@/lib/portfolio'
import { getPartners } from '@/lib/partners'

interface Props {
  params: { locale: string }
}

export const dynamic = 'force-dynamic'

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function HomePage({ params: { locale } }: Props) {
  setRequestLocale(locale)
  const [featuredProjects, partners, t] = await Promise.all([
    getAllProjects(),
    getPartners(),
    getTranslations({ locale, namespace: 'partners' }),
  ])

  return (
    <>
      <Hero />
      <Marquee />
      <FeaturedWork projects={featuredProjects} />
      <AboutSection />
      <PartnersSection
        partners={partners}
        label={t('label')}
        heading={t('heading')}
      />
      <ServicesSection />
      <ProcessSection />
      <CTASection />
    </>
  )
}
