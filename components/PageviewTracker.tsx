'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from '@/i18n/navigation'

const SEEN_KEY = 'maze_seen'   // has this browser ever been here
const DAY_KEY  = 'maze_day'    // the last day it was counted on

/**
 * Fire-and-forget first-party pageview tracker.
 *
 * Posts the (locale-stripped) pathname to /api/analytics/view on
 * every navigation. Independent of the cookie-consent banner — we do
 * not store any personal data, just an aggregate counter per page.
 * Bots, repeat-refreshes and admin self-views are filtered server-
 * side; here we only de-dupe consecutive renders on the same path.
 *
 * It also answers two questions ABOUT the browser without ever sending an
 * identity: "is this my first visit ever" and "is this my first view today".
 * Both are read from this site's own localStorage and sent as booleans, so
 * the server can count visitors and new visitors while holding nothing that
 * could be traced back to a person — no cookie, no id, no fingerprint.
 *
 * A browser that refuses storage still has its view counted; it simply is
 * not counted as a visitor, which undercounts rather than invents.
 */
export function PageviewTracker() {
  const pathname = usePathname()
  const last     = useRef<string | null>(null)

  useEffect(() => {
    if (!pathname || last.current === pathname) return
    last.current = pathname

    // The day as the studio lives it, so a visitor counted at 23:00 in
    // Tashkent belongs to that evening and not to the next UTC day.
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent' }).format(new Date())

    let firstEver = false
    let firstToday = false
    try {
      firstEver = window.localStorage.getItem(SEEN_KEY) === null
      firstToday = window.localStorage.getItem(DAY_KEY) !== today
      if (firstEver) window.localStorage.setItem(SEEN_KEY, '1')
      if (firstToday) window.localStorage.setItem(DAY_KEY, today)
    } catch {
      // Private mode, or storage switched off. Send neither claim.
      firstEver = false
      firstToday = false
    }

    // Only the host, and only when the visit came from somewhere else.
    let source: string | undefined
    try {
      const ref = document.referrer
      if (ref) {
        const host = new URL(ref).hostname
        if (host && host !== window.location.hostname) source = host
      }
    } catch { /* a malformed referrer is simply no referrer */ }

    void fetch('/api/analytics/view', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ path: pathname, firstEver, firstToday, source }),
      keepalive: true,
    }).catch(() => {
      /* swallow — analytics must never break the page */
    })
  }, [pathname])

  return null
}
