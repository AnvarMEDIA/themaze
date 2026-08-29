import { renderOg, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og'
import { getProjectsByTagSlug } from '@/lib/portfolio'

export const runtime     = 'nodejs'
export const alt         = 'MAZE Studio — Tagged work'
export const contentType = OG_CONTENT_TYPE
export const size        = OG_SIZE

export default async function Image({
  params,
}: {
  params: { locale: string; slug: string }
}) {
  const { locale, slug } = params
  const isRu = locale === 'ru'
  // The stored tag keeps its own capitalisation ("B2B", not "b2b"); the slug
  // is only the fallback for a tag that has since been removed.
  const data = await getProjectsByTagSlug(slug).catch(() => null)
  return renderOg({
    eyebrow:  isRu ? 'Портфолио' : 'Portfolio',
    title:    data?.tag ?? slug,
    subtitle: isRu ? 'Проекты по теме' : 'Projects on this theme',
    footer:   'PORTFOLIO · MAZE.UZ',
  })
}
