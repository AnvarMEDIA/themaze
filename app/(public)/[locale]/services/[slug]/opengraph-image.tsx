import { getTranslations } from 'next-intl/server'
import { renderOg, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og'

export const runtime     = 'nodejs'
export const alt         = 'MAZE Studio — Service'
export const contentType = OG_CONTENT_TYPE
export const size        = OG_SIZE

// Matches the accents the services index paints each row with, so a shared
// link and the page it opens feel like the same thing.
const ACCENTS: Record<string, string> = {
  branding:   '#C8FF47',
  rebranding: '#4B6EF5',
  identity:   '#D4A017',
  naming:     '#06D6A0',
  packaging:  '#FF4D1C',
  'ui-ux':    '#FF9E00',
  print:      '#B47AEA',
  motion:     '#4B6EF5',
  strategy:   '#C8FF47',
}

export default async function Image({
  params,
}: {
  params: { locale: string; slug: string }
}) {
  const { locale, slug } = params
  const isRu = locale === 'ru'

  // An unknown slug 404s on the page itself; the card just stays generic
  // rather than throwing inside an image response.
  const title = await getTranslations({ locale, namespace: `servicesPage.cluster.${slug}` })
    .then((t) => t('title'))
    .catch(() => (isRu ? 'Услуги' : 'Services'))

  return renderOg({
    eyebrow:  isRu ? 'Услуга' : 'Service',
    title,
    subtitle: isRu ? 'Ташкент · Центральная Азия' : 'Tashkent · Central Asia',
    footer:   `${slug.toUpperCase()} · MAZE.UZ`,
    accent:   ACCENTS[slug],
  })
}
