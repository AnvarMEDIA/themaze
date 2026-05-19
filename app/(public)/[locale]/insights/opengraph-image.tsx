import { renderOg, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og'

export const runtime     = 'nodejs'
export const alt         = 'MAZE Studio — Insights'
export const contentType = OG_CONTENT_TYPE
export const size        = OG_SIZE

export default async function Image({ params }: { params: { locale: string } }) {
  const isRu = params.locale === 'ru'
  return renderOg({
    eyebrow:  isRu ? 'Инсайты' : 'Insights',
    title:    isRu ? 'Заметки из студии.' : 'Notes from the studio.',
    subtitle: isRu ? 'О бренде, дизайне и ремесле' : 'On brand, design, craft',
    footer:   'INSIGHTS · MAZE.UZ',
  })
}
