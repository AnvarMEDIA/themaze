import { getPublishedPosts } from '@/lib/posts'
import { getPublishedProjects } from '@/lib/portfolio'
import { SITE_URL } from '@/lib/seo'
import en from '@/messages/en.json'

// llms-full.txt — the expanded companion to /llms.txt. Includes the full
// text of published articles and service detail so AI answer engines can
// read and cite the actual content, not just links. Built from real data.
export const dynamic = 'force-dynamic'

const SERVICE_SLUGS = [
  'branding', 'rebranding', 'identity', 'naming',
  'packaging', 'ui-ux', 'print', 'motion', 'strategy',
] as const

const clean = (s: string): string => s.replace(/\r\n/g, '\n').trim()

export async function GET() {
  const [posts, projects] = await Promise.all([getPublishedPosts(), getPublishedProjects()])
  const cluster = ((en as Record<string, unknown>).servicesPage as {
    cluster?: Record<string, { title?: string; tagline?: string; intro?: string; metaDescription?: string }>
  } | undefined)?.cluster ?? {}

  const services = SERVICE_SLUGS.map((slug) => {
    const c = cluster[slug] ?? {}
    const name = c.title || slug
    const intro = clean(c.intro || c.metaDescription || c.tagline || '')
    return `### ${name}\n${SITE_URL}/services/${slug}\n\n${intro}`
  }).join('\n\n')

  const work = projects.slice(0, 30).map((p) =>
    `### ${p.title} — ${p.client}\n${SITE_URL}/portfolio/${p.slug}\n\n${clean(p.description || p.shortDescription || '')}`,
  ).join('\n\n') || `Browse the portfolio at ${SITE_URL}/portfolio`

  const articles = posts.map((p) => {
    const body = clean(p.body || '')
    return `### ${p.title}\n${SITE_URL}/insights/${p.slug}\nPublished: ${p.publishedAt?.slice(0, 10)} · Author: ${p.author}\n\n${body}`
  }).join('\n\n---\n\n') || `Articles are published at ${SITE_URL}/insights`

  const body = `# MAZE Studio — Full content for LLMs

> MAZE is a branding and design studio based in Tashkent, Uzbekistan. Since 2019 we craft bold visual identities, logo systems, naming, packaging, print, UI/UX, motion and brand strategy for startups, enterprises and cultural institutions across Central Asia and beyond. Contact: hello@maze.uz. The studio works in English, Russian and Uzbek. A shorter index is at ${SITE_URL}/llms.txt.

## Services
${services}

## Selected work
${work}

## Articles (full text)
${articles}
`

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
