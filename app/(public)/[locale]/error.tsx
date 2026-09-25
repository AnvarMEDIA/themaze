'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'

interface Props {
  error:  Error & { digest?: string }
  reset: () => void
}

/**
 * Per-locale error boundary — runs inside the public layout so the
 * user still sees the site chrome, in the language they were reading.
 */
export default function LocaleError({ error, reset }: Props) {
  const t = useTranslations('errorPage')

  useEffect(() => {
    console.error('[LocaleError]', error)
  }, [error])

  return (
    <div className="min-h-[70vh] px-6 md:px-10 pt-36 md:pt-40 pb-20">
      <div className="max-w-[1440px] mx-auto">
        <p className="font-mono text-xs text-maze-muted mb-5">{t('label')}</p>
        <h1 className="display-md text-maze-cream mb-6 text-balance">{t('heading')}</h1>
        <p className="body-lg text-maze-muted mb-6 max-w-md text-pretty">{t('body')}</p>
        {error.digest && (
          <p className="font-mono text-xs text-maze-muted mb-8">{t('reference')}: {error.digest}</p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => reset()} className="btn btn-primary">
            {t('retry')}
          </button>
          <Link href="/" className="btn btn-quiet">
            {t('home')}
          </Link>
        </div>
      </div>
    </div>
  )
}
