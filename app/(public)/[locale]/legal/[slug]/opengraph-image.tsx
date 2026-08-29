import { getTranslations } from 'next-intl/server'
import { renderOg, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og'

export const runtime     = 'nodejs'
export const alt         = 'MAZE Studio — Legal'
export const contentType = OG_CONTENT_TYPE
export const size        = OG_SIZE

export default async function Image({
  params,
}: {
  params: { locale: string; slug: string }
}) {
  const { locale, slug } = params
  const isRu = locale === 'ru'

  const title = await getTranslations({ locale, namespace: 'legal' })
    .then((t) => t(`${slug}.title`))
    .catch(() => (isRu ? 'Правовая информация' : 'Legal'))

  return renderOg({
    eyebrow:  isRu ? 'Документы' : 'Legal',
    title,
    subtitle: 'MAZE Studio',
    footer:   'MAZE.UZ',
    accent:   '#8A8A8A',
  })
}
