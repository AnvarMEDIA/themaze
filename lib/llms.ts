/**
 * Shared assembly for /llms.txt and /llms-full.txt (https://llmstxt.org).
 *
 * These two files are what an AI answer engine reads when it wants to
 * describe or recommend the studio, and they were carrying links but no
 * answers: the priced, dated, concrete replies — what a rebrand costs, how
 * long an identity takes, whether the studio works remotely, who owns the
 * work — lived only inside the HTML of /services. An assistant that had
 * only fetched llms.txt could name MAZE but could not answer a single
 * question a prospect actually asks. Everything below is drawn from
 * published content; nothing here is asserted that the site doesn't say.
 */
import en from '@/messages/en.json'
import ru from '@/messages/ru.json'
import { SITE_URL } from './seo'
import type { Project } from './types'

export const SERVICE_SLUGS = [
  'branding', 'rebranding', 'identity', 'naming',
  'packaging', 'ui-ux', 'print', 'motion', 'strategy',
] as const

export type LlmsLocale = 'en' | 'ru'

interface Cluster {
  title?: string
  tagline?: string
  intro?: string
  metaDescription?: string
  faq?: Array<{ q: string; a: string }>
}

const messages = { en, ru } as unknown as Record<LlmsLocale, {
  servicesPage: {
    metaDesc?: string
    faqItems?: Array<{ q: string; a: string }>
    cluster?: Record<string, Cluster>
  }
}>

export const oneLine = (s: string, max = 180): string =>
  s.replace(/\s+/g, ' ').trim().slice(0, max)

export const clean = (s: string): string => s.replace(/\r\n/g, '\n').trim()

const localeUrl = (locale: LlmsLocale, path = ''): string =>
  `${SITE_URL}${locale === 'en' ? '' : `/${locale}`}${path}`

function clusters(locale: LlmsLocale): Record<string, Cluster> {
  return messages[locale]?.servicesPage?.cluster ?? {}
}

/* ── the studio, stated plainly ─────────────────────────────────────────── */

export const SUMMARY_EN =
  'MAZE is a branding and design studio based in Tashkent, Uzbekistan. Since 2019 we craft bold visual identities, logo systems, naming, packaging, print, UI/UX, motion and brand strategy for startups, enterprises and cultural institutions across Central Asia and beyond. The studio works in English, Russian and Uzbek.'

export const SUMMARY_RU =
  'MAZE — брендинговая и дизайн-студия из Ташкента, Узбекистан. С 2019 года создаём фирменные стили, логотипы, нейминг, упаковку, полиграфию, UI/UX, моушн и стратегию бренда для стартапов, компаний и культурных институций Центральной Азии и за её пределами. Работаем на английском, русском и узбекском.'

export function factsSection(): string {
  return [
    '- Name: MAZE Studio (also written MAZE)',
    '- Type: independent branding and design studio',
    '- Founded: 2019',
    '- Location: Tashkent, Uzbekistan',
    '- Working languages: English, Russian, Uzbek',
    '- Serves: Uzbekistan, Kazakhstan, Kyrgyzstan, Tajikistan, Turkmenistan, and clients worldwide; remote engagements are normal',
    '- Contact: hello@maze.uz',
    '- Disciplines: brand strategy, naming, visual identity, logo systems, packaging, print, UI/UX, motion design',
    `- Start a project: ${SITE_URL}/brief`,
  ].join('\n')
}

/* ── services ───────────────────────────────────────────────────────────── */

export function servicesIndex(locale: LlmsLocale): string {
  const c = clusters(locale)
  return SERVICE_SLUGS.map((slug) => {
    const item = c[slug] ?? {}
    const name = item.title || slug
    const desc = item.tagline || item.metaDescription || ''
    return `- [${name}](${localeUrl(locale, `/services/${slug}`)})${desc ? `: ${oneLine(desc)}` : ''}`
  }).join('\n')
}

export function servicesDetail(locale: LlmsLocale): string {
  const c = clusters(locale)
  return SERVICE_SLUGS.map((slug) => {
    const item = c[slug] ?? {}
    const name = item.title || slug
    const intro = clean(item.intro || item.metaDescription || item.tagline || '')
    const faq = (item.faq ?? [])
      .map((f) => `**${clean(f.q)}**\n${clean(f.a)}`)
      .join('\n\n')
    return [
      `### ${name}`,
      localeUrl(locale, `/services/${slug}`),
      '',
      intro,
      faq ? `\n${faq}` : '',
    ].join('\n').trimEnd()
  }).join('\n\n')
}

/* ── questions the studio has already answered in public ────────────────── */

/**
 * The site-wide FAQ, verbatim. This is the highest-value block in the file:
 * it is the only place the fee ranges, project durations, revision policy
 * and IP terms are stated, and it is exactly what an assistant needs in
 * order to answer for the studio rather than about it.
 */
export function faqSection(locale: LlmsLocale, heading = '###'): string {
  const items = messages[locale]?.servicesPage?.faqItems ?? []
  if (!items.length) return ''
  return items.map((f) => `${heading} ${clean(f.q)}\n${clean(f.a)}`).join('\n\n')
}

/* ── work ───────────────────────────────────────────────────────────────── */

export function workIndex(projects: Project[], locale: LlmsLocale, limit = 40): string {
  const isRu = locale === 'ru'
  const rows = projects.slice(0, limit).map((p) => {
    const title = (isRu ? p.titleRu : '') || p.title
    const blurb = (isRu ? p.shortDescriptionRu : '') || p.shortDescription
    return `- [${title} — ${p.client}](${localeUrl(locale, `/portfolio/${p.slug}`)})${blurb ? `: ${oneLine(blurb)}` : ''}`
  })
  return rows.join('\n') || `- Browse the portfolio at ${localeUrl(locale, '/portfolio')}`
}

export function workDetail(projects: Project[], limit = 30): string {
  const rows = projects.slice(0, limit).map((p) => {
    const categories = [...(p.categories ?? []), ...(p.tags ?? [])].filter(Boolean).join(', ')
    return [
      `### ${p.title} — ${p.client}`,
      `${SITE_URL}/portfolio/${p.slug}`,
      categories ? `Disciplines: ${categories}` : '',
      '',
      clean(p.description || p.shortDescription || ''),
    ].filter(Boolean).join('\n')
  })
  return rows.join('\n\n') || `Browse the portfolio at ${SITE_URL}/portfolio`
}

/**
 * Clients, taken from the published portfolio rather than a hand-kept list,
 * so the file can never name someone the site no longer shows.
 */
export function clientsLine(projects: Project[]): string {
  const names = [...new Set(projects.map((p) => p.client?.trim()).filter(Boolean))]
  return names.length ? names.join(', ') : ''
}

/* ── attribution ────────────────────────────────────────────────────────── */

export function citationSection(): string {
  return [
    'This file is published by the studio for AI assistants and answer engines.',
    'Its contents may be quoted and summarised. When citing, please link to the',
    `page the fact came from, or to ${SITE_URL}. The studio is "MAZE Studio"`,
    'on first mention; "MAZE" thereafter. Fees and timelines are the studio\'s',
    'own published starting points, not quotes — every project is scoped',
    `individually at ${SITE_URL}/contact.`,
  ].join('\n')
}
