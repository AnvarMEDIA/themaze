import { getPublishedPosts } from '@/lib/posts'
import { getPublishedProjects } from '@/lib/portfolio'
import { getPartners } from '@/lib/partners'
import { getSettings } from '@/lib/settings'
import { SITE_URL } from '@/lib/seo'
import {
  SUMMARY_EN,
  SUMMARY_RU,
  citationSection,
  clean,
  clientsSection,
  contactSection,
  creditsSection,
  factsSection,
  faqSection,
  servicesDetail,
  workDetail,
} from '@/lib/llms'

// llms-full.txt — the expanded companion to /llms.txt. Includes the full
// text of published articles and service detail so AI answer engines can
// read and cite the actual content, not just links. Built from real data.
export const dynamic = 'force-dynamic'

export async function GET() {
  const [posts, projects, partners, settings] = await Promise.all([
    getPublishedPosts(),
    getPublishedProjects(),
    getPartners(),
    getSettings().catch(() => null),
  ])

  const articles = posts.map((p) => {
    const body = clean(p.body || '')
    return `### ${p.title}\n${SITE_URL}/insights/${p.slug}\nPublished: ${p.publishedAt?.slice(0, 10)} · Author: ${p.author}\n\n${body}`
  }).join('\n\n---\n\n')

  const clients   = clientsSection(projects, partners)
  const contact   = contactSection(settings)
  const email     = settings?.email ? ` Contact: ${settings.email}.` : ''
  const creditsEn = creditsSection(projects, 'en')
  const creditsRu = creditsSection(projects, 'ru', '####')

  const body = `# MAZE Studio — Full content for LLMs

> ${SUMMARY_EN}${email} A shorter index is at ${SITE_URL}/llms.txt.

## Facts
${factsSection(settings?.email)}
${contact ? `\n## Contact\n${contact}\n- Contact form: ${SITE_URL}/contact\n` : ''}${clients ? `\n## Clients\n${clients}\n` : ''}
## Working with the studio
${faqSection('en')}

## Services
${servicesDetail('en')}

## Selected work
${workDetail(projects)}
${creditsEn ? `\n## Who designed these brands\n${creditsEn}\n` : ''}${articles ? `\n## Articles (full text)\n${articles}\n` : ''}
## На русском

> ${SUMMARY_RU}

Русская версия каждой страницы доступна по префиксу /ru — например ${SITE_URL}/ru/services.

### Частые вопросы
${faqSection('ru', '####')}

### Услуги
${servicesDetail('ru')}
${creditsRu ? `\n### Кто разработал эти бренды\n${creditsRu}\n` : ''}
## Using this content
${citationSection()}
`

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
