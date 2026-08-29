import { renderOg, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og'
import { categoryLabel } from '@/lib/utils'

export const runtime     = 'nodejs'
export const alt         = 'MAZE Studio — Portfolio category'
export const contentType = OG_CONTENT_TYPE
export const size        = OG_SIZE

export default async function Image({
  params,
}: {
  params: { locale: string; slug: string }
}) {
  const { locale, slug } = params
  const isRu = locale === 'ru'
  return renderOg({
    eyebrow:  isRu ? 'Портфолио' : 'Portfolio',
    title:    categoryLabel(slug, locale),
    subtitle: isRu ? 'Кейсы студии' : 'Selected case studies',
    footer:   `${slug.toUpperCase()} · MAZE.UZ`,
  })
}
