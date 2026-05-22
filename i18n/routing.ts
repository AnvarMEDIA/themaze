import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['en', 'ru', 'uz'] as const,
  defaultLocale: 'en',
  /** Default locale (en) has no prefix in URL: / instead of /en */
  localePrefix: 'as-needed',
})
