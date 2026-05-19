import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { notifyIndexNow } from '@/lib/indexing'
import { getPublishedProjects } from '@/lib/portfolio'
import { getPublishedPosts } from '@/lib/posts'
import { localeHref } from '@/lib/seo'
import { VALID_CATEGORIES } from '@/lib/utils'

export const dynamic = 'force-dynamic'

/**
 * Manual fan-out: re-submit every public URL to IndexNow. Useful
 * after a redesign, after a backlog of edits, or just monthly to
 * remind the crawlers that content is fresh.
 *
 * Body (optional):
 *   { urls: string[] }   — restrict to these URLs (otherwise full site)
 */
export async function POST(req: NextRequest) {
  const authed = await getAdminSession()
  if (!authed) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  let custom: string[] | undefined
  try {
    const body = await req.json().catch(() => null) as { urls?: unknown } | null
    if (body && Array.isArray(body.urls)) {
      custom = body.urls.filter((u): u is string => typeof u === 'string')
    }
  } catch { /* no body */ }

  let urls: string[]
  if (custom?.length) {
    urls = custom
  } else {
    const [projects, posts] = await Promise.all([getPublishedProjects(), getPublishedPosts()])
    const used = new Set<string>(projects.flatMap((p) => p.categories))
    const both = (path: string) => [localeHref('en', path), localeHref('ru', path)]
    urls = [
      ...both(''),
      ...both('portfolio'),
      ...both('services'),
      ...both('insights'),
      ...both('about'),
      ...both('contact'),
      ...VALID_CATEGORIES.flatMap((c) => both(`services/${c}`)),
      ...VALID_CATEGORIES.filter((c) => used.has(c)).flatMap((c) => both(`portfolio/category/${c}`)),
      ...projects.flatMap((p) => both(`portfolio/${p.slug}`)),
      ...posts.flatMap((p) => both(`insights/${p.slug}`)),
    ]
  }

  // IndexNow accepts up to 10k URLs per call; we slice defensively.
  const result = await notifyIndexNow(urls.slice(0, 9000))
  return NextResponse.json(result)
}
