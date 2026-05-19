import { renderOg, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og'

export const runtime     = 'nodejs'
export const alt         = 'MAZE — Branding & Design Studio'
export const contentType = OG_CONTENT_TYPE
export const size        = OG_SIZE

export default async function Image({ params }: { params: { locale: string } }) {
  const isRu = params.locale === 'ru'
  return renderOg({
    eyebrow:  isRu ? 'Ташкент · с 2019' : 'Tashkent · since 2019',
    title:    isRu ? 'Мы создаём смелые бренды.' : 'We build bold brands.',
    subtitle: isRu ? 'Брендинговая и дизайн студия' : 'Branding & Design Studio',
    footer:   'MAZE.UZ',
  })
}
