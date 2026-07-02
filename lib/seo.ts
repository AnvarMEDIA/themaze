import type { Metadata } from 'next'

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.maze.uz'

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
