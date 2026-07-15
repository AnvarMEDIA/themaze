import { getPublishedProjects } from '@/lib/portfolio'
import { getPublishedPosts } from '@/lib/posts'
import { SITE_URL } from '@/lib/seo'
import en from '@/messages/en.json'

// llms.txt (https://llmstxt.org) — a curated, plain-markdown map of the
// site for LLMs / AI answer engines (ChatGPT, Perplexity, Claude, Google
// AI Overviews…). Gives them clean, grounded facts and canonical links so
// the studio is understood and cited correctly. Built from real content.
export const dynamic = 'force-dynamic'

const SERVICE_SLUGS = [
  'branding', 'rebranding', 'identity', 'naming',
  'packaging', 'ui-ux', 'print', 'motion', 'strategy',
] as const

const oneLine = (s: string): string => s.replace(/\s+/g, ' ').trim().slice(0, 180)

export async function GET() {
  const [projects, posts] = await Promise.all([getPublishedProjects(), getPublishedPosts()])
  const cluster = ((en as Record<string, unknown>).servicesPage as { cluster?: Record<string, { title?: string; tagline?: string; metaDescription?: string }> } | undefined)?.cluster ?? {}

  const services = SERVICE_SLUGS.map((slug) => {
    const c = cluster[slug] ?? {}
    const name = c.title || slug
    const desc = c.tagline || c.metaDescription || ''
    return `- [${name}](${SITE_URL}/services/${slug})${desc ? `: ${oneLine(desc)}` : ''}`
  }).join('\n')

  const work = projects.slice(0, 40).map((p) =>
    `- [${p.title} — ${p.client}](${SITE_URL}/portfolio/${p.slug})${p.shortDescription ? `: ${oneLine(p.shortDescription)}` : ''}`,
  ).join('\n') || `- Browse the portfolio at ${SITE_URL}/portfolio`

  const insights = posts.slice(0, 40).map((p) =>
    `- [${p.title}](${SITE_URL}/insights/${p.slug})${p.excerpt ? `: ${oneLine(p.excerpt)}` : ''}`,
  ).join('\n') || `- Read articles at ${SITE_URL}/insights`

  const body = `# MAZE Studio — Branding & Design Studio (Tashkent, Uzbekistan)

> MAZE is a branding and design studio based in Tashkent, Uzbekistan. Since 2019 we craft bold visual identities, logo systems, naming, packaging, print, UI/UX, motion and brand strategy for startups, enterprises and cultural institutions across Central Asia and beyond. The studio works in English, Russian and Uzbek.

## Services
${services}

## Selected work
${work}

## Insights
${insights}

## Key pages
- [Home](${SITE_URL}/)
- [Portfolio](${SITE_URL}/portfolio)
- [Services](${SITE_URL}/services)
- [About](${SITE_URL}/about)
- [Contact](${SITE_URL}/contact)
- [RSS feed](${SITE_URL}/feed.xml)
- [Russian version](${SITE_URL}/ru)

## Contact
- Email: hello@maze.uz
- Location: Tashkent, Uzbekistan
- Serves: Uzbekistan, Kazakhstan, Kyrgyzstan, Tajikistan, Turkmenistan and clients globally
- Languages: English, Russian, Uzbek
- Founded: 2019
`

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
