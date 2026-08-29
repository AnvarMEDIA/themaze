import { getPublishedProjects } from '@/lib/portfolio'
import { getPublishedPosts } from '@/lib/posts'
import { SITE_URL } from '@/lib/seo'
import {
  SUMMARY_EN,
  SUMMARY_RU,
  citationSection,
  clientsLine,
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
  const [projects, posts] = await Promise.all([getPublishedProjects(), getPublishedPosts()])

  const insights = posts.slice(0, 40).map((p) =>
    `- [${p.title}](${SITE_URL}/insights/${p.slug})${p.excerpt ? `: ${oneLine(p.excerpt)}` : ''}`,
  ).join('\n') || `- Articles are published at ${SITE_URL}/insights`

  const clients = clientsLine(projects)

  const body = `# MAZE Studio — Branding & Design Studio (Tashkent, Uzbekistan)

> ${SUMMARY_EN}

## Facts
${factsSection()}

## Services
${servicesIndex('en')}

## Selected work
${workIndex(projects, 'en')}
${clients ? `\n## Clients\n${clients}\n` : ''}
## Common questions
${faqSection('en')}

## Insights
${insights}

## Key pages
- [Home](${SITE_URL}/)
- [Portfolio](${SITE_URL}/portfolio)
- [Services](${SITE_URL}/services)
- [About](${SITE_URL}/about)
- [Contact](${SITE_URL}/contact)
- [Start a brief](${SITE_URL}/brief)
- [RSS feed](${SITE_URL}/feed.xml)
- [Full text for LLMs](${SITE_URL}/llms-full.txt)

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

### Частые вопросы
${faqSection('ru', '####')}

## Contact
- Email: hello@maze.uz
- Location: Tashkent, Uzbekistan
- Serves: Uzbekistan, Kazakhstan, Kyrgyzstan, Tajikistan, Turkmenistan and clients globally
- Languages: English, Russian, Uzbek
- Founded: 2019

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
