import type { Metadata } from 'next'
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
import { TestimonialsSection } from '@/components/home/TestimonialsSection'
import { JsonLd } from '@/components/JsonLd'
import { testimonialsJsonLd } from '@/lib/jsonLd'
import { getPublishedProjects } from '@/lib/portfolio'
import { getPartners } from '@/lib/partners'
import { getTestimonials } from '@/lib/testimonials'
import { localizedAlternates } from '@/lib/seo'

interface Props {
  params: { locale: string }
}

export const dynamic = 'force-dynamic'

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({ params: { locale } }: Props): Promise<Metadata> {
  const isRu = locale === 'ru'

  if (isRu) {
    return {
      title: 'MAZE — Брендинговая и Дизайн Студия | Ташкент, Узбекистан',
      description:
        'MAZE — премиальная брендинговая студия из Ташкента. Разрабатываем фирменные стили, логотипы, нейминг и стратегию бренда для амбициозных компаний по всей Центральной Азии и за рубежом.',
      keywords: [
        'брендинг студия Ташкент',
        'брендинговое агентство Узбекистан',
        'фирменный стиль Ташкент',
        'разработка логотипа',
        'айдентика Ташкент',
        'нейминг бренда Ташкент',
        'упаковка дизайн Узбекистан',
        'брендбук',
        'визуальная идентичность',
        'стратегия бренда Центральная Азия',
        'дизайн студия Ташкент',
        'MAZE Студия',
      ],
      alternates: localizedAlternates(locale),
    }
  }

  return {
    alternates: localizedAlternates(locale),
  }
}

export default async function HomePage({ params: { locale } }: Props) {
  setRequestLocale(locale)
  const [featuredProjects, partners, testimonials, tp, tt] = await Promise.all([
    getPublishedProjects(),
    getPartners(),
    getTestimonials(),
    getTranslations({ locale, namespace: 'partners' }),
    getTranslations({ locale, namespace: 'testimonialsSection' }),
  ])

  return (
    <>
      {testimonials.length > 0 && <JsonLd id="ld-reviews" data={testimonialsJsonLd(testimonials, locale)} />}
      <Hero />
      <Marquee />
      <FeaturedWork projects={featuredProjects} />
      <AboutSection />
      <PartnersSection
        partners={partners}
        label={tp('label')}
        heading={tp('heading')}
      />
      <TestimonialsSection
        testimonials={testimonials}
        locale={locale}
        label={tt('label')}
        heading={tt('heading')}
      />
      <ServicesSection />
      <ProcessSection />
      <CTASection />
    </>
  )
}
