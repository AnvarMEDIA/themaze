'use client'

import { useEffect } from 'react'
import { Link } from '@/i18n/navigation'

interface Props {
  error:  Error & { digest?: string }
  reset: () => void
}

/**
 * Per-locale error boundary — runs inside the public layout so the
 * user still sees the site chrome.
 */
export default function LocaleError({ error, reset }: Props) {
  useEffect(() => {
    console.error('[LocaleError]', error)
  }, [error])

  return (
    <main className="min-h-[70vh] flex items-center justify-center px-6 md:px-10 py-32">
      <div className="max-w-xl text-center">
        <p className="label-sm text-maze-muted mb-6">Error · 500</p>
        <h1 className="display-md text-maze-lime mb-6 leading-[0.9]">Something broke.</h1>
        <p className="body-lg text-maze-muted mb-6">
          An unexpected error occurred. Please try again, or go back home.
        </p>
        {error.digest && (
          <p className="label-sm text-maze-muted mb-8 font-mono">Reference: {error.digest}</p>
        )}
        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center gap-2 px-6 py-3.5 bg-maze-lime text-maze-ink font-bold rounded-full label-sm hover:bg-maze-paper transition-colors"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3.5 border border-maze-border text-maze-muted font-bold rounded-full label-sm hover:border-maze-cream hover:text-maze-cream transition-colors"
          >
            Home
          </Link>
        </div>
      </div>
    </main>
  )
}
