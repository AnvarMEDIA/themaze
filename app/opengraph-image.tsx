import { renderOg, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og'

export const runtime     = 'nodejs'
export const alt         = 'MAZE — Branding & Design Studio'
export const contentType = OG_CONTENT_TYPE
export const size        = OG_SIZE

export default async function Image() {
  return renderOg({
    eyebrow:  'Tashkent · since 2019',
    title:    'We build bold brands.',
    subtitle: 'Branding & Design Studio',
    footer:   'MAZE.UZ',
  })
}
