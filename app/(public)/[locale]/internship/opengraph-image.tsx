import { renderOg, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og'

export const runtime     = 'nodejs'
export const alt         = 'MAZE Studio — Internship'
export const contentType = OG_CONTENT_TYPE
export const size        = OG_SIZE

// The card a shared link shows in Telegram and elsewhere: what it is, for
// how long, and the honest terms, before anyone opens it.
export default async function Image({ params }: { params: { locale: string } }) {
  const isRu = params.locale === 'ru'
  return renderOg({
    eyebrow:  isRu ? 'Стажировка' : 'Internship',
    title:    isRu ? 'Стажировка в MAZE.' : 'Internship at MAZE.',
    subtitle: isRu ? 'Айдентика · 3 месяца · Ташкент' : 'Brand identity · 3 months · Tashkent',
    footer:   'INTERNSHIP · MAZE.UZ',
  })
}
