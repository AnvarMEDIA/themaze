'use client'

import type { ReactNode } from 'react'
import { NextIntlClientProvider, useLocale, useMessages, useTimeZone } from 'next-intl'
import type { LocalizedBrief } from '@/lib/briefContent'

/**
 * The brief form's texts as the admin set them (lib/briefContent), laid over
 * the message files for everything inside. The form, the sheet beside it
 * and the thank-you read them through next-intl as they always did.
 *
 * Client-side on purpose: the page's own provider already holds the whole
 * message set, so only the brief's namespace has to travel to the browser
 * a second time, not every message of the site.
 */
export function BriefMessages({ brief, children }: { brief: LocalizedBrief; children: ReactNode }) {
  const messages = useMessages()
  const locale   = useLocale()
  const timeZone = useTimeZone()
  const base     = (messages.brief ?? {}) as Record<string, unknown>

  return (
    <NextIntlClientProvider
      locale={locale}
      timeZone={timeZone}
      messages={{ ...messages, brief: { ...base, ...brief } }}
    >
      {children}
    </NextIntlClientProvider>
  )
}
