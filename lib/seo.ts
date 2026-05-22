import type { Metadata } from 'next'

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.maze.uz'

const LOCALES = ['en', 'ru', 'uz'] as const
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
  const bcp47: Record<string, string> = { en: 'en-US', ru: 'ru-RU', uz: 'uz-UZ' }
  for (const l of LOCALES) {
    languages[bcp47[l]] = localeHref(l, clean)
  }
  return {
    canonical: localeHref(locale, clean),
    languages,
  }
}
