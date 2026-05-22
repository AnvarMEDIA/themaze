import type { Metadata } from 'next'
import { setRequestLocale, getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { routing } from '@/i18n/routing'
import { PortfolioGrid } from '@/components/portfolio/PortfolioGrid'
import { getClientSlugs, getProjectsByClientSlug } from '@/lib/portfolio'
import { JsonLd } from '@/components/JsonLd'
import { breadcrumbJsonLd, portfolioListJsonLd, homeCrumb, portfolioCrumb } from '@/lib/jsonLd'
import { localizedAlternates, SITE_URL } from '@/lib/seo'

interface Props {
  params: { locale: string; slug: string }
}

export const dynamic = 'force-dynamic'

export async function generateStaticParams() {
  const clients = await getClientSlugs()
  return routing.locales.flatMap((locale) =>
    clients.map(({ slug }) => ({ locale, slug })),
  )
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getProjectsByClientSlug(params.slug)
  if (!data) return {}
  const loc = params.locale
  const title = loc === 'ru'
    ? `Работы для ${data.clientName} | MAZE Studio`
    : loc === 'uz'
    ? `${data.clientName} uchun ishlar | MAZE Studio`
    : `Work for ${data.clientName} | MAZE Studio`
  const description = loc === 'ru'
    ? `Все проекты MAZE Studio для бренда ${data.clientName}: брендинг, айдентика, упаковка и больше.`
    : loc === 'uz'
    ? `MAZE Studio tomonidan ${data.clientName} uchun barcha loyihalar: brendlash, aydentika, qadoqlash va boshqalar.`
    : `Every MAZE Studio project for ${data.clientName} — branding, identity, packaging and more.`
  return {
    title,
    description,
    alternates: localizedAlternates(params.locale, `portfolio/client/${params.slug}`),
    openGraph: { title, description },
    twitter:   { card: 'summary_large_image', title, description },
  }
}

export default async function PortfolioClientPage({ params }: Props) {
  const data = await getProjectsByClientSlug(params.slug)
  if (!data) notFound()
  setRequestLocale(params.locale)

  const t = await getTranslations({ locale: params.locale, namespace: 'portfolio' })

  const loc2      = params.locale
  const homeLabel = loc2 === 'ru' ? 'Главная' : loc2 === 'uz' ? 'Bosh sahifa' : 'Home'
  const portLabel = loc2 === 'ru' ? 'Портфолио' : 'Portfolio'
  const crumbs = breadcrumbJsonLd([
    homeCrumb(params.locale, homeLabel),
    portfolioCrumb(params.locale, portLabel),
    {
      name: data.clientName,
      url:  `${SITE_URL}${params.locale === 'en' ? '' : '/' + params.locale}/portfolio/client/${params.slug}`,
    },
  ])

  return (
    <main className="min-h-screen">
      <JsonLd data={[crumbs, portfolioListJsonLd(data.projects, params.locale)]} />

      <section className="pt-28 pb-16 px-6 md:px-10 border-b border-maze-border">
        <div className="max-w-[1440px] mx-auto">
          <p className="label-sm text-maze-lime mb-5">{loc2 === 'ru' ? 'Клиент' : loc2 === 'uz' ? 'Mijoz' : 'Client'}</p>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <h1 className="display-md text-maze-cream max-w-xl">
              {loc2 === 'ru' ? `Работы для ${data.clientName}` : loc2 === 'uz' ? `${data.clientName} uchun ishlar` : `Work for ${data.clientName}`}
            </h1>
            <p className="body-lg text-maze-muted max-w-sm md:text-right">
              {data.projects.length} {data.projects.length === 1 ? t('projectSingular') : t('projectPlural')}
            </p>
          </div>
        </div>
      </section>

      <section className="pt-12 pb-24 px-6 md:px-10">
        <div className="max-w-[1440px] mx-auto">
          <PortfolioGrid projects={data.projects} />
        </div>
      </section>
    </main>
  )
}
