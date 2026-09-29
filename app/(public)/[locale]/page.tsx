import type { Metadata } from 'next'
import type { Project } from '@/lib/types'
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
import { InsightsSection } from '@/components/home/InsightsSection'
import { JsonLd } from '@/components/JsonLd'
import { testimonialsJsonLd } from '@/lib/jsonLd'
import { getPublishedProjects } from '@/lib/portfolio'
import { getPublishedPosts } from '@/lib/posts'
import { getPartners } from '@/lib/partners'
import { getTestimonials } from '@/lib/testimonials'
import { pageMeta } from '@/lib/seo'

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
    return pageMeta({
      locale,
      title: 'MAZE — брендинговая и дизайн-студия в Ташкенте',
      description:
        'Премиальная брендинговая студия из Ташкента. Фирменные стили, логотипы, нейминг и стратегия бренда для компаний Узбекистана и Центральной Азии.',
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
    })
  }

  return pageMeta({
    locale,
    title: 'MAZE — Branding & Design Studio in Tashkent, Uzbekistan',
    description:
      'Premium branding and design studio in Tashkent. Bold brand identities, digital experiences and design systems for companies across Central Asia.',
  })
}

/**
 * Six of the published projects, freshly shuffled. The draw happens here, on
 * the server, once per request (the page is force-dynamic) — the homepage
 * still shows a different six on every load, but the server HTML and the
 * hydrated DOM now agree on which six. Doing it inside the client component
 * meant two different draws and a hydration error on the busiest page.
 */
function pickSix(projects: Project[]): Project[] {
  const copy = [...projects]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy.slice(0, 6)
}

export default async function HomePage({ params: { locale } }: Props) {
  setRequestLocale(locale)
  const [featuredProjects, partners, testimonials, posts, tp, tt] = await Promise.all([
    getPublishedProjects(),
    getPartners(),
    getTestimonials(),
    getPublishedPosts(),
    getTranslations({ locale, namespace: 'partners' }),
    getTranslations({ locale, namespace: 'testimonialsSection' }),
  ])

  return (
    <>
      {testimonials.length > 0 && <JsonLd id="ld-reviews" data={testimonialsJsonLd(testimonials, locale)} />}
      <Hero />
      <Marquee />
      <FeaturedWork projects={pickSix(featuredProjects)} />
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
      <InsightsSection posts={posts.slice(0, 3)} locale={locale} />
      <CTASection />
    </>
  )
}
