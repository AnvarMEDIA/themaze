'use client'

import { useLocale } from 'next-intl'
import { useRouter, usePathname } from '@/i18n/navigation'
import { useTransition } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

const EASE_OUT = [0.23, 1, 0.32, 1] as const

export function LangToggle() {
  const locale    = useLocale()
  const router    = useRouter()
  const pathname  = usePathname()
  const [pending, startTransition] = useTransition()

  const switchTo = (next: string) => {
    if (next === locale || pending) return
    startTransition(() => {
      router.replace(pathname, { locale: next })
    })
  }

  return (
    <div
      role="group"
      aria-label="Language switcher"
      className="relative flex items-center gap-0.5 p-0.5 rounded-full border border-maze-border bg-maze-black/40"
    >
      {(['en', 'ru', 'uz'] as const).map((lang) => {
        const isActive = locale === lang
        const ariaLabel = lang === 'en' ? 'Switch to English'
                        : lang === 'ru' ? 'Switch to Russian'
                        : 'Switch to Uzbek'
        return (
          <button
            key={lang}
            onClick={() => switchTo(lang)}
            disabled={pending}
            aria-pressed={isActive}
            aria-label={ariaLabel}
            className={cn(
              'relative z-10 px-3 py-1 rounded-full label-sm disabled:opacity-50',
              'transition-[color,transform] duration-150 active:scale-[0.95]',
              isActive
                ? 'text-maze-ink'
                : 'text-maze-muted [@media(hover:hover)_and_(pointer:fine)]:hover:text-maze-cream'
            )}
          >
            {/* Sliding lime pill — shared layoutId animates between buttons */}
            {isActive && (
              <motion.span
                layoutId="lang-pill"
                className="absolute inset-0 rounded-full bg-maze-lime"
                transition={{ duration: 0.22, ease: EASE_OUT }}
                style={{ zIndex: -1 }}
              />
            )}
            {lang.toUpperCase()}
          </button>
        )
      })}
    </div>
  )
}
