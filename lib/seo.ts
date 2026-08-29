import type { Metadata } from 'next'

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.maze.uz'

export const BRAND = 'MAZE Studio'

const LOCALES = ['en', 'ru'] as const
type Locale = (typeof LOCALES)[number]

/**
 * Prefix a path with the locale segment. English has no prefix.
 */
export function localeHref(locale: string, path = ''): string {
  const clean = path.replace(/^\/+/, '')
  const prefix = locale === 'en' ? '' : `/${locale}`
  return `${SITE_URL}${prefix}${clean ? `/${clean}` : ''}`
}

/**
 * Build `alternates` for a public page so every locale lists every
 * other locale and x-default. Google expects all hreflang entries to
 * be reciprocal.
 *
 * @example
 *   const alternates = localizedAlternates('en', 'portfolio/uzpay-fintech')
 */
export function localizedAlternates(
  locale: string,
  path = '',
): NonNullable<Metadata['alternates']> {
  const clean = path.replace(/^\/+/, '')
  const languages: Record<string, string> = {
    'x-default': localeHref('en', clean),
  }
  for (const l of LOCALES) {
    languages[l === 'en' ? 'en-US' : 'ru-RU'] = localeHref(l, clean)
  }
  return {
    canonical: localeHref(locale, clean),
    languages,
  }
}

/**
 * Metadata to return from a dynamic route's `generateMetadata` when the
 * slug doesn't resolve (the page then calls `notFound()`). Explicitly
 * noindex so a placeholder/404 URL is never indexed or clustered as a
 * duplicate. Returning `{}` here would instead inherit whatever the parent
 * layout declares — which is exactly the canonical-leak we want to avoid.
 */
export const notFoundMetadata: Metadata = {
  robots: { index: false, follow: false },
}

/**
 * Per-locale Open Graph locale fields. Next.js shallow-merges metadata,
 * so a page that declares its own `openGraph` loses the root's
 * `og:locale` (hardcoded `en_US`). Spread this into each page's
 * `openGraph` so Russian pages announce `ru_RU` to social crawlers.
 *
 * @example openGraph: { title, description, ...ogLocale(locale) }
 */
export function ogLocale(locale: string): {
  locale: string
  alternateLocale: string[]
} {
  return locale === 'ru'
    ? { locale: 'ru_RU', alternateLocale: ['en_US'] }
    : { locale: 'en_US', alternateLocale: ['ru_RU'] }
}

/* ── titles ─────────────────────────────────────────────────────────────── */

/**
 * Resolve a page title against the root template (`%s | MAZE Studio`).
 *
 * The brand is appended only when the title doesn't already name the
 * studio; a title that does opts out via `absolute`. That single rule is
 * what makes "Insights — MAZE Studio | MAZE Studio" structurally
 * impossible, rather than something every page has to remember not to do.
 *
 * `full` is the resulting <title> — what Open Graph and Twitter should
 * carry, since neither has a template of its own.
 */
export function resolveTitle(title: string): { meta: Metadata['title']; full: string } {
  return /\bMAZE\b/i.test(title)
    ? { meta: { absolute: title }, full: title }
    : { meta: title, full: `${title} | ${BRAND}` }
}

/**
 * Trim a description to `max` characters on a word boundary. Only for
 * text assembled from stored content (a project's own copy) — authored
 * meta strings are written to length rather than cut.
 */
export function clampDescription(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  const cut = clean.slice(0, max - 1)
  const stop = Math.max(cut.lastIndexOf(' '), cut.lastIndexOf('—'))
  return `${(stop > max * 0.6 ? cut.slice(0, stop) : cut).replace(/[\s,;:—-]+$/, '')}…`
}

/* ── the page metadata builder ──────────────────────────────────────────── */

export interface PageMetaInput {
  locale: string
  /** Path without the locale prefix, e.g. `portfolio/uzpay-fintech`. */
  path?: string
  title: string
  description: string
  keywords?: string[]
  /**
   * Explicit social image. Omit to inherit the route's generated
   * `opengraph-image.tsx`, which Next also mirrors into `twitter:image`.
   */
  images?: string[]
  type?: 'website' | 'article'
  article?: {
    publishedTime?: string
    modifiedTime?: string
    authors?: string[]
    tags?: string[]
  }
  robots?: Metadata['robots']
}

/**
 * The one place a public page's metadata is assembled.
 *
 * Next.js merges metadata per top-level field, so a page that declares
 * its own `openGraph` REPLACES the root's entirely — it does not merge
 * into it. Every page that set `openGraph: { title, description }` was
 * therefore silently dropping `og:url`, `og:site_name` and `og:type`,
 * while every page that set none at all inherited the root's
 * `og:url` — announcing the homepage as the canonical target of a share
 * from any of 17 URLs. Building the whole object here makes both
 * failure modes unreachable.
 */
export function pageMeta(input: PageMetaInput): Metadata {
  const { locale, path = '', description, keywords, images, robots } = input
  const title = resolveTitle(input.title)
  const url = localeHref(locale, path)

  const shared = {
    url,
    siteName: BRAND,
    title: title.full,
    description,
    ...ogLocale(locale),
    ...(images?.length ? { images } : {}),
  }

  return {
    title: title.meta,
    description,
    ...(keywords?.length ? { keywords } : {}),
    alternates: localizedAlternates(locale, path),
    openGraph:
      input.type === 'article'
        ? { type: 'article', ...shared, ...(input.article ?? {}) }
        : { type: 'website', ...shared },
    twitter: {
      card: 'summary_large_image',
      title: title.full,
      description,
      ...(images?.length ? { images } : {}),
    },
    ...(robots ? { robots } : {}),
  }
}
