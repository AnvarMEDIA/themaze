import Link from 'next/link'
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { setRequestLocale } from 'next-intl/server'
import { routing } from '@/i18n/routing'
import { PublicShell } from '@/components/layout/PublicShell'
import { NOT_FOUND_HEADER } from '@/lib/publicRoutes'
import Template from './(public)/[locale]/template'
import LocaleNotFound from './(public)/[locale]/not-found'

/**
 * The locale to answer in, when this is the 404 of a public address: the
 * middleware marks such a request (lib/publicRoutes.ts). Null for every
 * other request.
 */
function publicLocale(): string | null {
  const locale = headers().get(NOT_FOUND_HEADER)
  return locale && (routing.locales as readonly string[]).includes(locale) ? locale : null
}

export function generateMetadata(): Metadata {
  const robots = { index: false, follow: false }
  // The public 404 keeps the site's title, as it always had.
  return publicLocale() ? { robots } : { title: '404 — Page not found | MAZE Studio', robots }
}

/**
 * Root 404. Next renders this file in two situations.
 *
 * As a page, on the server, with a 404, when a request matches no route.
 * This is the only 404 that arrives as real HTML (a page that throws
 * `notFound()` gets an empty document for a script to fill), so it is how
 * the public site answers an address nobody claims: the middleware marks
 * the request and sends it where no page lives, and the mark turns this
 * into the localized screen inside the header and the footer, the same one
 * app/(public)/[locale]/not-found.tsx shows. Without the mark (an unknown
 * path under /admin or /api, a missing file) it is the bare page below.
 *
 * And as the fallback of the root layout, which Next renders along with
 * every page of the site in case that page throws, this one included. That
 * copy is never the one on screen for a marked request and has to stay
 * small, or the header, the footer and the translations would travel twice.
 * The two are told apart by what Next hands them: a page gets
 * `searchParams`, the fallback gets no props at all.
 */
export default function NotFoundGlobal(props: { searchParams?: unknown }) {
  const locale = 'searchParams' in props ? publicLocale() : null

  if (locale) {
    setRequestLocale(locale)
    return (
      <PublicShell locale={locale}>
        {/* The page wrapper every public page has, entrance animation included. */}
        <Template>
          <LocaleNotFound />
        </Template>
      </PublicShell>
    )
  }

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgb(var(--bg, 245 244 240))',
          color: 'rgb(var(--text, 10 10 10))',
          // The variable lives on the root layout's <html>, which this page does
          // not always have; without a fallback inside var() the whole
          // declaration is dropped and the page falls to Times.
          fontFamily: 'var(--font-sans, system-ui), system-ui, sans-serif',
          padding: '2rem',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: 520 }}>
          <p style={{ fontSize: 12, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgb(var(--muted, 112 110 100))' }}>
            Error · 404
          </p>
          <h1 style={{ fontSize: 'clamp(3rem, 10vw, 8rem)', fontWeight: 900, margin: '1rem 0', lineHeight: 0.9, color: 'rgb(var(--text, 10 10 10))' }}>
            Lost in the maze.
          </h1>
          <p style={{ color: 'rgb(var(--muted, 112 110 100))', fontSize: 18, lineHeight: 1.6, marginBottom: '2rem' }}>
            The page you were looking for can’t be found.
          </p>
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '14px 28px',
              borderRadius: 999,
              background: 'rgb(var(--lime, 10 10 10))',
              color: 'rgb(var(--on-accent, 255 255 255))',
              fontWeight: 700,
              textDecoration: 'none',
              fontSize: 13,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            Back to home ↗
          </Link>
        </div>
      </body>
    </html>
  )
}
