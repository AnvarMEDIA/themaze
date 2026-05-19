'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { EVENT, readConsent, setConsent, type ConsentValue } from '@/lib/consent'

const EASE_OUT = [0.23, 1, 0.32, 1] as const

/**
 * Bottom-left consent banner. Renders only when no choice exists
 * (or the user explicitly reset their preference via "Cookie
 * settings" in the footer). Accepting / rejecting persists to
 * localStorage and emits a `maze:consent-change` event picked up by
 * the Analytics component.
 */
export function CookieBanner() {
  const t = useTranslations('cookieBanner')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setOpen(readConsent() === null)
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<ConsentValue | null>).detail
      setOpen(detail === null || detail === undefined)
    }
    window.addEventListener(EVENT, onChange)
    return () => window.removeEventListener(EVENT, onChange)
  }, [])

  const choose = (v: ConsentValue) => {
    setConsent(v)
    setOpen(false)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.35, ease: EASE_OUT }}
          role="region"
          aria-label="Cookie consent"
          className="fixed bottom-4 left-4 right-4 sm:right-auto sm:max-w-md z-[60] bg-maze-dark/95 backdrop-blur-md border border-maze-border rounded-2xl p-5 shadow-2xl"
        >
          <p className="label-sm text-maze-lime mb-2">{t('label')}</p>
          <h2 className="text-base font-semibold text-maze-cream mb-2">{t('title')}</h2>
          <p className="text-sm text-maze-muted leading-relaxed mb-4">
            {t('body')}{' '}
            <Link href="/legal/cookies" className="text-maze-cream underline hover:text-maze-lime transition-colors">
              {t('learnMore')}
            </Link>
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => choose('accepted')}
              className="px-5 py-2.5 bg-maze-lime text-maze-ink font-bold rounded-full label-sm hover:bg-maze-paper transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-maze-cream"
            >
              {t('accept')}
            </button>
            <button
              type="button"
              onClick={() => choose('rejected')}
              className="px-5 py-2.5 border border-maze-border text-maze-muted rounded-full label-sm hover:border-maze-cream hover:text-maze-cream transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-maze-lime"
            >
              {t('reject')}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
