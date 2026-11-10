'use client'

import { useEffect } from 'react'
import { reportContactConversion } from '@/lib/adsConversion'

/** A way to reach the studio: an e-mail address, a phone number or Telegram. */
function isContactLink(href: string): boolean {
  return /^(mailto:|tel:)/i.test(href) || /^https?:\/\/(t\.me|telegram\.me)\//i.test(href)
}

/**
 * The "Click" side of the Google Ads conversion "Контакт" (lib/adsConversion.ts):
 * a click on the studio's e-mail, phone or Telegram link, wherever it sits
 * (the footer, the contact page, the mobile menu, the closing call to action).
 *
 * One listener on the document, the way components/layout/CustomCursor finds
 * its links, rather than an `onClick` on each of them: a link added later is
 * counted without anyone remembering to wire it. It listens in the capture
 * phase, so a link whose own handler stops the event (the arrows in the
 * services list do) is still seen.
 *
 * It only watches. It never holds a link back or waits for Google, which is
 * what the callback in Google's click snippet does (see lib/adsConversion.ts).
 *
 * The public layout renders this, the admin does not: clicks in the admin
 * panel are the studio's own.
 */
export function ContactClickTracker() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const origin = event.target instanceof Element ? event.target : (event.target as Node | null)?.parentElement
      const link = origin?.closest('a[href]')
      if (link && isContactLink(link.getAttribute('href') ?? '')) reportContactConversion()
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [])

  return null
}
