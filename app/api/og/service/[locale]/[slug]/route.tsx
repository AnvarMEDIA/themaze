import { getTranslations } from 'next-intl/server'
import { renderOg } from '@/lib/og'
import { isServiceSlug } from '@/lib/services'

export const runtime = 'nodejs'

/**
 * A service page's link-preview card (its og:image) when the service has
 * no cover: the service's name on the site's own card. With a cover, the
 * page names the cover's 1200×630 picture instead (generateMetadata in
 * app/(public)/[locale]/services/[slug]/page.tsx). Being a plain address
 * rather than an opengraph-image file is what lets the page choose.
 */
export async function GET(_req: Request, { params }: { params: { locale: string; slug: string } }) {
  const { locale, slug } = params
  const isRu = locale === 'ru'
  const title = isServiceSlug(slug)
    ? await getTranslations({ locale: isRu ? 'ru' : 'en', namespace: `servicesPage.cluster.${slug}` })
      .then((t) => t('title'))
      .catch(() => (isRu ? 'Услуги' : 'Services'))
    : (isRu ? 'Услуги' : 'Services')

  const card = await renderOg({
    eyebrow:  isRu ? 'Услуга' : 'Service',
    title,
    subtitle: isRu ? 'Ташкент · Центральная Азия' : 'Tashkent · Central Asia',
    footer:   `${slug.toUpperCase()} · MAZE.UZ`,
  })
  // A day at the edge: a renamed service shows within it.
  card.headers.set('Cache-Control', 'public, max-age=3600, s-maxage=86400')
  return card
}
