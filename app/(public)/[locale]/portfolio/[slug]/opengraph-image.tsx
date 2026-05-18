import { getProjectBySlug } from '@/lib/portfolio'
import { categoryLabel } from '@/lib/utils'
import { renderOg, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og'

export const runtime     = 'nodejs'
export const alt         = 'MAZE Studio project'
export const contentType = OG_CONTENT_TYPE
export const size        = OG_SIZE

interface Props {
  params: { locale: string; slug: string }
}

export default async function Image({ params }: Props) {
  const project = await getProjectBySlug(params.slug)
  const isRu    = params.locale === 'ru'

  if (!project) {
    return renderOg({
      eyebrow: isRu ? 'Брендинг и дизайн' : 'Branding & Design',
      title:   'MAZE Studio',
      footer:  'MAZE.UZ',
    })
  }

  const title   = isRu ? (project.titleRu || project.title) : project.title
  const eyebrow = project.categories?.[0]
    ? categoryLabel(project.categories[0], params.locale)
    : (isRu ? 'Брендинг и дизайн' : 'Branding & Design')

  return renderOg({
    eyebrow,
    title,
    subtitle: project.client,
    footer:   isRu ? 'ПРОЕКТ · MAZE.UZ' : 'CASE STUDY · MAZE.UZ',
    accent:   project.accentColor,
    year:     project.showYear !== false ? project.year : undefined,
  })
}
