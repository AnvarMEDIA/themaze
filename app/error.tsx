'use client'

import { useEffect } from 'react'

interface Props {
  error:  Error & { digest?: string }
  reset: () => void
}

/**
 * Root error boundary. Must be a client component and return its own
 * <html>/<body> because it is a fallback for the root layout itself.
 */
export default function GlobalError({ error, reset }: Props) {
  useEffect(() => {
    console.error('[GlobalError]', error)
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#080808',
          color: '#EDEBE3',
          fontFamily: 'var(--font-sans), system-ui, sans-serif',
          padding: '2rem',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: 560 }}>
          <p style={{ fontSize: 12, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#5A5A5A' }}>
            Error · 500
          </p>
          <h1 style={{ fontSize: 'clamp(2.5rem, 8vw, 6rem)', fontWeight: 900, margin: '1rem 0', lineHeight: 0.95, color: '#C8FF47' }}>
            Something broke.
          </h1>
          <p style={{ color: '#8A8A8A', fontSize: 18, lineHeight: 1.6, marginBottom: '2rem' }}>
            An unexpected error occurred. Our team has been notified.
          </p>
          {error.digest && (
            <p style={{ color: '#5A5A5A', fontFamily: 'monospace', fontSize: 12, marginBottom: '2rem' }}>
              Reference: {error.digest}
            </p>
          )}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => reset()}
              style={{
                padding: '14px 28px',
                borderRadius: 999,
                background: '#C8FF47',
                color: '#0A0A0A',
                fontWeight: 700,
                border: 'none',
                fontSize: 13,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
            <a
              href="/"
              style={{
                padding: '14px 28px',
                borderRadius: 999,
                background: 'transparent',
                color: '#8A8A8A',
                border: '1px solid #252525',
                fontWeight: 700,
                textDecoration: 'none',
                fontSize: 13,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              Home
            </a>
          </div>
        </div>
      </body>
    </html>
  )
}
