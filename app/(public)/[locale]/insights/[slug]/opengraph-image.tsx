import { getPostBySlug } from '@/lib/posts'
import { renderOg, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og'

export const runtime     = 'nodejs'
export const alt         = 'MAZE Studio insight'
export const contentType = OG_CONTENT_TYPE
export const size        = OG_SIZE

interface Props {
  params: { locale: string; slug: string }
}

export default async function Image({ params }: Props) {
  const post = await getPostBySlug(params.slug)
  const isRu = params.locale === 'ru'

  if (!post) {
    return renderOg({
      eyebrow:  isRu ? 'Инсайты' : 'Insights',
      title:    'MAZE Studio',
      footer:   'INSIGHTS · MAZE.UZ',
    })
  }

  const title = isRu ? (post.titleRu || post.title) : post.title
  return renderOg({
    eyebrow:  isRu ? 'Инсайты' : 'Insights',
    title,
    subtitle: post.author || 'MAZE Studio',
    footer:   isRu ? 'ИНСАЙТЫ · MAZE.UZ' : 'INSIGHTS · MAZE.UZ',
    year:     new Date(post.publishedAt).getFullYear(),
  })
}
