import { renderOg, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og'

export const runtime     = 'nodejs'
export const alt         = 'MAZE Studio — Services'
export const contentType = OG_CONTENT_TYPE
export const size        = OG_SIZE

export default async function Image({ params }: { params: { locale: string } }) {
  const isRu = params.locale === 'ru'
  return renderOg({
    eyebrow:  isRu ? 'Услуги' : 'Services',
    title:    isRu ? 'Брендинг, айдентика, упаковка, цифра.' : 'Brand, identity, packaging, digital.',
    subtitle: 'MAZE Studio',
    footer:   isRu ? 'УСЛУГИ · MAZE.UZ' : 'SERVICES · MAZE.UZ',
  })
}
