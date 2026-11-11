'use client'

import { useEffect, useRef } from 'react'
import { useLocale } from 'next-intl'
import { usePathname } from '@/i18n/navigation'
import { marketingFromQuery, type Marketing } from '@/lib/stats/marketing'

const SEEN_KEY  = 'maze_seen'    // localStorage: this browser has been here before
const VISIT_KEY = 'maze_visit'   // sessionStorage: where this visit came from

/** The other site the page was opened from, or undefined. */
function externalReferrer(): string | undefined {
  try {
    const ref = document.referrer
    if (ref && new URL(ref).origin !== window.location.origin) return ref.slice(0, 200)
  } catch { /* a malformed referrer is no referrer */ }
  return undefined
}

/**
 * Where this visit came from, worked out once per page load and kept for the
 * visit (sessionStorage), so every page of it carries its source.
 *
 * A landing link's campaign wins: utm tags, or an ad platform's click marker
 * (only which platform's, never the id). A link with a fresh campaign
 * replaces the visit's old one. Without a campaign, the site the visit came
 * from. Nothing at all is a direct visit.
 */
let visit: Marketing | null | undefined
function visitSource(): Marketing | undefined {
  if (visit !== undefined) return visit ?? undefined
  const referrer = externalReferrer()
  const fresh = marketingFromQuery(window.location.search)
  let found: Marketing | null = null
  if (fresh) {
    found = referrer ? { ...fresh, referrer } : fresh
  } else {
    try {
      const stored = window.sessionStorage.getItem(VISIT_KEY)
      if (stored) found = JSON.parse(stored) as Marketing
    } catch { /* storage refused: this page alone */ }
    if (!found && referrer) found = { referrer }
  }
  if (found) {
    try { window.sessionStorage.setItem(VISIT_KEY, JSON.stringify(found)) } catch { /* not kept */ }
  }
  visit = found
  return found ?? undefined
}

/**
 * Has this browser never been here? True for its first view only: the next
 * pages of the same visit are not a new visitor again. Only the answer is
 * sent; the flag stays in the browser.
 */
let firstEverAsked = false
function isFirstEver(): boolean {
  if (firstEverAsked) return false
  firstEverAsked = true
  try {
    const first = window.localStorage.getItem(SEEN_KEY) === null
    if (first) window.localStorage.setItem(SEEN_KEY, '1')
    return first
  } catch {
    return false
  }
}

function send(payload: Record<string, unknown>) {
  try {
    const body = JSON.stringify(payload)
    const queued = typeof navigator.sendBeacon === 'function'
      && navigator.sendBeacon('/api/visit', new Blob([body], { type: 'application/json' }))
    if (!queued) {
      void fetch('/api/visit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true,
      }).catch(() => {})
    }
  } catch { /* statistics must never break the page */ }
}

/**
 * The site's own statistics (lib/stats): one view per page opened, and a
 * heartbeat a minute while the page is in front of someone, which is what
 * "on the site now" is made of and is not counted as a view.
 *
 * No cookie and no identifier travel with it. The server tells visitors
 * apart by a hash of the request's address and browser with a salt that
 * changes every day, and stores neither; the browser adds only the page, its
 * language, the visit's source, and whether it has been here before.
 */
export function PageviewTracker() {
  const pathname = usePathname()
  const locale = useLocale()
  const last = useRef<string | null>(null)

  useEffect(() => {
    if (!pathname || last.current === pathname) return
    last.current = pathname
    send({ page: pathname, locale, marketing: visitSource(), firstEver: isFirstEver() })
  }, [pathname, locale])

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') send({ beat: true })
    }, 60_000)
    return () => window.clearInterval(id)
  }, [])

  return null
}
