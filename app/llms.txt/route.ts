import { getPublishedProjects } from '@/lib/portfolio'
import { getPublishedPosts } from '@/lib/posts'
import { getPartners } from '@/lib/partners'
import { getSettings } from '@/lib/settings'
import { SITE_URL } from '@/lib/seo'
import {
  SUMMARY_EN,
  SUMMARY_RU,
  SUMMARY_UZ,
  citationSection,
  clientsSection,
  contactSection,
  creditsSection,
  factsSection,
  faqSection,
  oneLine,
  servicesIndex,
  workIndex,
} from '@/lib/llms'

// llms.txt (https://llmstxt.org) — a curated, plain-markdown map of the
// site for LLMs / AI answer engines (ChatGPT, Perplexity, Claude, Google
// AI Overviews…). Gives them clean, grounded facts and canonical links so
// the studio is understood and cited correctly. Built from real content.
export const dynamic = 'force-dynamic'

export async function GET() {
  const [projects, posts, partners, settings] = await Promise.all([
    getPublishedProjects(),
    getPublishedPosts(),
    getPartners(),
    getSettings().catch(() => null),
  ])

  // Left out while the journal is empty, like the sitemap does: the page
  // carries a noindex then, and pointing an assistant at it is a dead end.
  const insights = posts.slice(0, 40).map((p) =>
    `- [${p.title}](${SITE_URL}/insights/${p.slug})${p.excerpt ? `: ${oneLine(p.excerpt)}` : ''}`,
  ).join('\n')

  const clients   = clientsSection(projects, partners)
  const contact   = contactSection(settings)
  const creditsEn = creditsSection(projects, 'en')
  const creditsRu = creditsSection(projects, 'ru', '####')
  const creditsUz = creditsSection(projects, 'uz', '####')

  const body = `# MAZE Studio — Branding & Design Studio (Tashkent, Uzbekistan)

> ${SUMMARY_EN}

## Facts
${factsSection(settings?.email)}

## Services
${servicesIndex('en')}

## Selected work
${workIndex(projects, 'en')}
${creditsEn ? `\n## Who designed these brands\n${creditsEn}\n` : ''}${clients ? `\n## Clients\n${clients}\n` : ''}
## Common questions
${faqSection('en')}
${insights ? `\n## Insights\n${insights}\n` : ''}
## Key pages
- [Home](${SITE_URL}/)
- [Portfolio](${SITE_URL}/portfolio)
- [Services](${SITE_URL}/services)
- [About](${SITE_URL}/about)
- [Contact](${SITE_URL}/contact)
- [Start a brief](${SITE_URL}/brief)
${insights ? `- [RSS feed](${SITE_URL}/feed.xml)\n` : ''}- [Full text for LLMs](${SITE_URL}/llms-full.txt)

## На русском
> ${SUMMARY_RU}

Сайт полностью доступен на русском языке — те же страницы с префиксом /ru:

- [Главная](${SITE_URL}/ru)
- [Портфолио](${SITE_URL}/ru/portfolio)
- [Услуги](${SITE_URL}/ru/services)
- [О студии](${SITE_URL}/ru/about)
- [Контакты](${SITE_URL}/ru/contact)
- [Бриф](${SITE_URL}/ru/brief)

### Услуги
${servicesIndex('ru')}
${creditsRu ? `\n### Кто разработал эти бренды\n${creditsRu}\n` : ''}
### Частые вопросы
${faqSection('ru', '####')}

## O'zbekcha
> ${SUMMARY_UZ}

Sayt ingliz va rus tillarida: ${SITE_URL} va ${SITE_URL}/ru.
${creditsUz ? `\n### Bu brendlarni kim ishlab chiqqan\n${creditsUz}\n` : ''}
## Contact
${contact || '- Location: Tashkent, Uzbekistan'}
- Contact form: ${SITE_URL}/contact

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
