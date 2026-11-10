import { readConsent } from '@/lib/consent'

/**
 * The Google Ads conversion "Контакт": a client has written to the studio.
 *
 * Google hands this over as an "event snippet", meant to be pasted into the
 * thank-you page that follows a conversion:
 *
 *   gtag('event', 'conversion', { send_to: 'AW-…/…' })
 *
 * Run on every page load it would count every visit as a lead, and this site
 * has no thank-you page: the forms answer in place, with a toast or a success
 * screen. So the call is made here, at the moment a form has really been
 * accepted by the server, from the two forms a client writes through
 * (components/contact/ContactForm and components/brief/BriefForm). The
 * internship application is a job application, not a lead, and does not call
 * it.
 *
 * The Google tag that picks it up is the one in components/GoogleTagManager
 * (SecondaryGoogleTagManager), which shares this `dataLayer`. The hosts it
 * reports to are in the CSP in next.config.js.
 */
export const ADS_CONVERSION_CONTACT = 'AW-18565782280/oeosCKWmzbUdEIi27ZRF'

type WithDataLayer = Window & { dataLayer?: unknown[] }

/**
 * Google's own `gtag()`, as its snippet defines it. The tag tells a command
 * from plain data by the pushed value being an `arguments` object, not an
 * array, which is why this is not a one-line `dataLayer.push([...])`.
 */
function gtag(..._args: unknown[]): void {
  const w = window as WithDataLayer
  w.dataLayer = w.dataLayer || []
  // eslint-disable-next-line prefer-rest-params
  w.dataLayer.push(arguments)
}

/**
 * Report one "Контакт" conversion. Call it only after the server has accepted
 * the form; it decides for itself whether this is a visit that may be
 * counted.
 */
export function reportContactConversion(): void {
  if (typeof window === 'undefined') return

  // Not from `next dev`: someone trying the form on their own machine is
  // not a lead, and Google would count it as one.
  if (process.env.NODE_ENV !== 'production') return

  // Only for a visitor who accepted the cookie banner, as with the analytics
  // (components/Analytics): the cookie policy says analytics cookies are set
  // "with your consent", and the banner is the only place that choice is
  // known; nothing passes it on to the tag.
  if (readConsent() !== 'accepted') return

  try {
    gtag('event', 'conversion', { send_to: ADS_CONVERSION_CONTACT })
  } catch {
    // A form that has just been sent must never fail because of the tracking.
  }
}
