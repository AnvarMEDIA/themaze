import { renderOg, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og'
import { getProjectsByClientSlug } from '@/lib/portfolio'

export const runtime     = 'nodejs'
export const alt         = 'MAZE Studio — Client work'
export const contentType = OG_CONTENT_TYPE
export const size        = OG_SIZE

export default async function Image({
  params,
}: {
  params: { locale: string; slug: string }
}) {
  const { locale, slug } = params
  const isRu = locale === 'ru'
  const data = await getProjectsByClientSlug(slug).catch(() => null)
  const name = data?.clientName ?? slug
  return renderOg({
    eyebrow:  isRu ? 'Клиент' : 'Client',
    title:    name,
    subtitle: isRu ? 'Работы MAZE Studio' : 'Work by MAZE Studio',
    footer:   'PORTFOLIO · MAZE.UZ',
  })
}
