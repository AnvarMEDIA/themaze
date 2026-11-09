/**
 * The legal documents. Each one has a page at /legal/<slug>, written in
 * content/legal/<slug>.<locale>.md.
 *
 * In a module of its own, with no imports, because two places need the
 * list: the page, and the middleware (lib/publicRoutes.ts), which runs
 * where the page's file reads cannot.
 */
export const LEGAL_SLUGS = ['privacy', 'terms', 'cookies'] as const

export type LegalSlug = (typeof LEGAL_SLUGS)[number]

export function isLegalSlug(s: string): s is LegalSlug {
  return (LEGAL_SLUGS as readonly string[]).includes(s)
}
