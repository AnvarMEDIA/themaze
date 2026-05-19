import { renderOg, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og'

export const runtime     = 'nodejs'
export const alt         = 'About MAZE Studio'
export const contentType = OG_CONTENT_TYPE
export const size        = OG_SIZE

export default async function Image({ params }: { params: { locale: string } }) {
  const isRu = params.locale === 'ru'
  return renderOg({
    eyebrow:  isRu ? 'О студии' : 'About',
    title:    isRu ? 'Небольшая студия с большими амбициями.' : 'A small studio with big ambitions.',
    subtitle: isRu ? 'Команда MAZE' : 'The MAZE team',
    footer:   'ABOUT · MAZE.UZ',
  })
}
