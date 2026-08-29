import { renderOg, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og'

export const runtime     = 'nodejs'
export const alt         = 'MAZE Studio — Portfolio'
export const contentType = OG_CONTENT_TYPE
export const size        = OG_SIZE

export default async function Image({ params }: { params: { locale: string } }) {
  const isRu = params.locale === 'ru'
  return renderOg({
    eyebrow:  isRu ? 'Портфолио' : 'Portfolio',
    title:    isRu ? 'Работы, которые говорят за себя.' : 'Work that speaks for itself.',
    subtitle: isRu ? 'Айдентика · Упаковка · Цифра' : 'Identity · Packaging · Digital',
    footer:   'PORTFOLIO · MAZE.UZ',
  })
}
