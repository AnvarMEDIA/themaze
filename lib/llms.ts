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
import { telegramHref } from './utils'
import type { Partner } from './partners'
import type { SiteSettings } from './settings'
import type { Project } from './types'

import { SERVICE_SLUGS } from './services'
export { SERVICE_SLUGS }

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

export function factsSection(email?: string): string {
  return [
    '- Name: MAZE Studio (also written MAZE)',
    '- Type: independent branding and design studio',
    '- Founded: 2019',
    '- Location: Tashkent, Uzbekistan',
    '- Working languages: English, Russian, Uzbek',
    '- Serves: Uzbekistan, Kazakhstan, Kyrgyzstan, Tajikistan, Turkmenistan, and clients worldwide; remote engagements are normal',
    ...(email ? [`- Contact: ${email}`] : []),
    '- Disciplines: brand strategy, naming, visual identity, logo systems, packaging, print, UI/UX, motion design',
    `- Start a project: ${SITE_URL}/brief`,
  ].join('\n')
}

/**
 * Contact details as set in the admin: the same source as the contact page,
 * the footer and the structured data. The email used to be typed in here,
 * and it was not the one those pages show.
 */
export function contactSection(settings: SiteSettings | null): string {
  if (!settings) return ''
  const address = [settings.addressDetail, settings.address].filter(Boolean).join(', ')
  return [
    settings.email     && `- Email: ${settings.email}`,
    settings.phone     && `- Phone: ${settings.phone}`,
    settings.telegram  && `- Telegram: ${telegramHref(settings.telegram)}`,
    address            && `- Address: ${address}`,
    settings.instagram && `- Instagram: ${settings.instagram}`,
    settings.behance   && `- Behance: ${settings.behance}`,
    settings.linkedin  && `- LinkedIn: ${settings.linkedin}`,
    settings.twitter   && `- X (Twitter): ${settings.twitter}`,
  ].filter(Boolean).join('\n')
}

/* ── services ───────────────────────────────────────────────────────────── */

export function servicesIndex(locale: LlmsLocale): string {
  const c = clusters(locale)
  return SERVICE_SLUGS.map((slug) => {
    const item = c[slug] ?? {}
    const name = item.title || slug
    // The description says what the service covers and where; the tagline
    // is a slogan ("Designed for permanence.") that tells a reader nothing.
    const desc = item.metaDescription || item.tagline || ''
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

// "Axelus — Axelus" says the same thing twice. The client is named only
// when it adds something the title doesn't already say.
function titleWithClient(title: string, client?: string): string {
  const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')
  const name = client?.trim()
  return name && !norm(title).includes(norm(name)) ? `${title} — ${name}` : title
}

export function workIndex(projects: Project[], locale: LlmsLocale, limit = 40): string {
  const isRu = locale === 'ru'
  const rows = projects.slice(0, limit).map((p) => {
    const title = (isRu ? p.titleRu : '') || p.title
    const blurb = (isRu ? p.shortDescriptionRu : '') || p.shortDescription
    return `- [${titleWithClient(title, p.client)}](${localeUrl(locale, `/portfolio/${p.slug}`)})${blurb ? `: ${oneLine(blurb)}` : ''}`
  })
  return rows.join('\n') || `- Browse the portfolio at ${localeUrl(locale, '/portfolio')}`
}

// Every published project. The full file is the one meant to be complete,
// and a cap of 30 had started leaving the 31st out.
export function workDetail(projects: Project[]): string {
  const rows = projects.map((p) => {
    const categories = [...(p.categories ?? []), ...(p.tags ?? [])].filter(Boolean).join(', ')
    return [
      `### ${titleWithClient(p.title, p.client)}`,
      `${SITE_URL}/portfolio/${p.slug}`,
      categories ? `Disciplines: ${categories}` : '',
      '',
      clean(p.description || p.shortDescription || ''),
    ].filter(Boolean).join('\n')
  })
  return rows.join('\n\n') || `Browse the portfolio at ${SITE_URL}/portfolio`
}

/**
 * Clients, taken from what the site shows rather than a hand-kept list, so
 * the file can never name someone the site no longer shows: the "Trusted by"
 * list managed in the admin (it holds the ministries and the Academy of
 * Sciences, which the case studies alone never named), then every client
 * with a published case study.
 */
export function clientsSection(projects: Project[], partners: Partner[]): string {
  const unique = (names: Array<string | undefined>) =>
    [...new Set(names.map((n) => n?.trim()).filter(Boolean))]
  const trustedBy = unique(partners.map((p) => p.name))
  const withCase  = unique(projects.map((p) => p.client))
  return [
    trustedBy.length && `- Clients & partners listed on the site: ${trustedBy.join(', ')}`,
    withCase.length  && `- Clients with a published case study: ${withCase.join(', ')}`,
  ].filter(Boolean).join('\n')
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
