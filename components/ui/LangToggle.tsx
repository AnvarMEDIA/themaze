'use client'

import { useLocale } from 'next-intl'
import { useRouter, usePathname } from '@/i18n/navigation'
import { useTransition } from 'react'

export function LangToggle() {
  const locale    = useLocale()
  const router    = useRouter()
  const pathname  = usePathname()
  const [pending, startTransition] = useTransition()

  const nextLocale = locale === 'en' ? 'ru' : 'en'

  const handleSwitch = () => {
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale })
    })
  }

  return (
    <button
      onClick={handleSwitch}
      disabled={pending}
      aria-label={`Switch to ${nextLocale === 'en' ? 'English' : 'Russian'}`}
      className="label-sm text-maze-muted hover:text-maze-cream transition-colors duration-200 disabled:opacity-50 w-8 text-center"
    >
      {locale === 'en' ? 'RU' : 'EN'}
    </button>
  )
}
