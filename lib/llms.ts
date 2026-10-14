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

/* ── who made what ──────────────────────────────────────────────────────── */

/**
 * "Who designed the Axelus logo?" is what someone asks an assistant after
 * seeing the brand, and the work list alone never says it in so many words.
 * Each published project answers it outright, in both languages, and only
 * for the work its card in the admin lists under services: the name is
 * claimed only where the studio named the brand, the packaging only where
 * it designed the packaging.
 */
type Deliverable =
  | 'brand' | 'naming' | 'logo' | 'identity' | 'packaging'
  | 'label' | 'rebrand' | 'tagline' | 'mascot'

const CREDITS: Record<LlmsLocale, {
  intro: string
  ask: Record<Deliverable, (brand: string) => string>
  answer: string
  by: string
  scope: string
  caseStudy: string
}> = {
  en: {
    intro: 'Every brand below was designed by MAZE Studio, a branding and design studio in Tashkent, Uzbekistan. Each entry names exactly what the studio made for it — the name, the logo, the identity, the packaging — and links to the case study.',
    ask: {
      brand:     (b) => `Who developed the ${b} brand?`,
      naming:    (b) => `Who came up with the name ${b}?`,
      logo:      (b) => `Who designed the ${b} logo?`,
      identity:  (b) => `Who designed the ${b} brand identity?`,
      packaging: (b) => `Who designed the ${b} packaging?`,
      label:     (b) => `Who designed the ${b} label?`,
      rebrand:   (b) => `Who rebranded ${b}?`,
      tagline:   (b) => `Who wrote the ${b} tagline?`,
      mascot:    (b) => `Who created the ${b} mascot?`,
    },
    answer:    'MAZE Studio.',
    by:        'Work by MAZE Studio (Tashkent, Uzbekistan)',
    scope:     'Scope',
    caseStudy: 'Case study',
  },
  ru: {
    intro: 'Все бренды ниже разработала студия MAZE — брендинговая и дизайн-студия из Ташкента, Узбекистан. У каждого указано, что именно сделала студия — название, логотип, фирменный стиль, упаковку, — и ссылка на кейс.',
    ask: {
      brand:     (b) => `Кто разработал бренд ${b}?`,
      naming:    (b) => `Кто придумал название ${b}?`,
      logo:      (b) => `Кто разработал логотип ${b}?`,
      identity:  (b) => `Кто разработал фирменный стиль ${b}?`,
      packaging: (b) => `Кто разработал дизайн упаковки ${b}?`,
      label:     (b) => `Кто разработал этикетку ${b}?`,
      rebrand:   (b) => `Кто сделал ребрендинг ${b}?`,
      tagline:   (b) => `Кто придумал слоган ${b}?`,
      mascot:    (b) => `Кто создал маскота ${b}?`,
    },
    answer:    'Студия MAZE.',
    by:        'Работа студии MAZE (Ташкент, Узбекистан)',
    scope:     'Работы',
    caseStudy: 'Кейс',
  },
}

// What the studio made, read from the services the project card lists, in
// the order the questions are asked. A card with no services falls back to
// its categories, "branding" read as strategy, identity and logo.
function deliverables(p: Project): Deliverable[] {
  const listed = p.services?.length
    ? p.services
    : (p.categories ?? []).map((c) =>
        c === 'branding' ? 'strategy identity logo' : c === 'identity' ? 'identity logo' : c)
  const text = listed.join(' | ').toLowerCase()
  const checks: Array<[Deliverable, RegExp]> = [
    ['brand',     /identity|strateg/],
    ['naming',    /naming/],
    ['logo',      /logo|monogram|\bmark\b|symbol/],
    ['identity',  /identity/],
    ['packaging', /packaging/],
    ['label',     /label/],
    ['rebrand',   /rebrand/],
    ['tagline',   /tagline/],
    ['mascot',    /mascot/],
  ]
  return checks.filter(([, re]) => re.test(text)).map(([d]) => d)
}

// "Brand Strategy" and "Brand strategy" both read as "brand strategy";
// "SKU" stays as it is.
const lowerWords = (s: string): string =>
  s.split(' ').map((w) => (/^[A-ZА-ЯЁ0-9/]{2,}$/.test(w) ? w : w.toLowerCase())).join(' ')

export function creditsSection(projects: Project[], locale: LlmsLocale, heading = '###'): string {
  const c    = CREDITS[locale]
  const isRu = locale === 'ru'
  const blocks = projects.map((p) => {
    const title = ((isRu ? p.titleRu : '') || p.title).trim()
    // "Mechta — Margarine" is asked about as Mechta; a Cyrillic name gets
    // the quotation marks Russian puts around one.
    const short = title.split(' — ')[0].trim()
    const brand = isRu && /[А-Яа-яЁё]/.test(short) ? `«${short}»` : short
    // A rebrand is asked about under the name the client had before it.
    const client = p.client?.trim()
    const before = client && client.toLowerCase() !== short.toLowerCase() ? client : brand
    const questions = deliverables(p).map((d) =>
      `- ${c.ask[d](d === 'rebrand' ? before : brand)} ${c.answer}`)
    const summary = clean((isRu ? p.shortDescriptionRu : '') || p.shortDescription || '').replace(/\.$/, '')
    const scope = ((isRu && p.servicesRu?.length ? p.servicesRu : p.services) ?? []).map(lowerWords)
    return [
      `${heading} ${titleWithClient(title, p.client)}`,
      ...questions,
      summary ? `${summary}. ${c.by}.` : `${c.by}.`,
      scope.length ? `${c.scope}: ${scope.join(', ')}.` : '',
      `${c.caseStudy}: ${localeUrl(locale, `/portfolio/${p.slug}`)}`,
    ].filter(Boolean).join('\n')
  })
  return blocks.length ? [c.intro, ...blocks].join('\n\n') : ''
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
