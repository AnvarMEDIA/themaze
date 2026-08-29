import { renderOg, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og'

export const runtime     = 'nodejs'
export const alt         = 'MAZE Studio — Contact'
export const contentType = OG_CONTENT_TYPE
export const size        = OG_SIZE

export default async function Image({ params }: { params: { locale: string } }) {
  const isRu = params.locale === 'ru'
  return renderOg({
    eyebrow:  isRu ? 'Контакты' : 'Contact',
    title:    isRu ? 'Расскажите о проекте.' : 'Tell us about the project.',
    subtitle: isRu ? 'Отвечаем в течение 24 часов' : 'We reply within 24 hours',
    footer:   'HELLO@MAZE.UZ · TASHKENT',
  })
}
