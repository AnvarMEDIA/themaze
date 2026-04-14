import { setRequestLocale } from 'next-intl/server'
import { routing } from '@/i18n/routing'
import { Hero }            from '@/components/home/Hero'
import { Marquee }         from '@/components/home/Marquee'
import { FeaturedWork }    from '@/components/home/FeaturedWork'
import { AboutSection }    from '@/components/home/AboutSection'
import { ServicesSection } from '@/components/home/ServicesSection'
import { ProcessSection }  from '@/components/home/ProcessSection'
import { CTASection }      from '@/components/home/CTASection'
import { getFeaturedProjects } from '@/lib/portfolio'

interface Props {
  params: { locale: string }
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default function HomePage({ params: { locale } }: Props) {
  setRequestLocale(locale)
  const featuredProjects = getFeaturedProjects()

  return (
    <>
      <Hero />
      <Marquee />
      <FeaturedWork projects={featuredProjects} />
      <AboutSection />
      <ServicesSection />
      <ProcessSection />
      <CTASection />
    </>
  )
}
