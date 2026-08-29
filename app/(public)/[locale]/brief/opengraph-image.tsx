import { renderOg, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og'

export const runtime     = 'nodejs'
export const alt         = 'MAZE Studio — Client brief'
export const contentType = OG_CONTENT_TYPE
export const size        = OG_SIZE

export default async function Image({ params }: { params: { locale: string } }) {
  const isRu = params.locale === 'ru'
  return renderOg({
    eyebrow:  isRu ? 'Бриф' : 'Brief',
    title:    isRu ? 'Начнём с брифа.' : 'Start with a brief.',
    subtitle: isRu ? 'Предложение за 24 часа' : 'A proposal in 24 hours',
    footer:   'BRIEF · MAZE.UZ',
  })
}
