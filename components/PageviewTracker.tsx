'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from '@/i18n/navigation'

/**
 * Fire-and-forget first-party pageview tracker.
 *
 * Posts the (locale-stripped) pathname to /api/analytics/view on
 * every navigation. Independent of the cookie-consent banner — we do
 * not store any personal data, just an aggregate counter per page.
 * Bots, repeat-refreshes and admin self-views are filtered server-
 * side; here we only de-dupe consecutive renders on the same path.
 */
export function PageviewTracker() {
  const pathname = usePathname()
  const last     = useRef<string | null>(null)

  useEffect(() => {
    if (!pathname || last.current === pathname) return
    last.current = pathname
    void fetch('/api/analytics/view', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ path: pathname }),
      keepalive: true,
    }).catch(() => {
      /* swallow — analytics must never break the page */
    })
  }, [pathname])

  return null
}
