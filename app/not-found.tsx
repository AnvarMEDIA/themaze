import Link from 'next/link'

export const metadata = {
  title: '404 — Page not found | MAZE Studio',
  robots: { index: false, follow: false },
}

/**
 * Root 404 — renders when the request does not fall into a [locale]
 * segment (e.g. unknown top-level path, bad locale). The per-locale
 * 404 handles in-locale misses.
 */
export default function NotFoundGlobal() {
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
