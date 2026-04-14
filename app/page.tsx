import { Hero }            from '@/components/home/Hero'
import { Marquee }         from '@/components/home/Marquee'
import { FeaturedWork }    from '@/components/home/FeaturedWork'
import { AboutSection }    from '@/components/home/AboutSection'
import { ServicesSection } from '@/components/home/ServicesSection'
import { ProcessSection }  from '@/components/home/ProcessSection'
import { CTASection }      from '@/components/home/CTASection'
import { getFeaturedProjects } from '@/lib/portfolio'

export default function HomePage() {
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
