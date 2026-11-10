import { dataLayer } from '@/lib/dataLayer'

/**
 * The Google Ads conversion "Контакт", reported straight to the Google tag,
 * for a click on the studio's e-mail, phone or Telegram link
 * (components/ContactClickTracker).
 *
 * Google hands this conversion over as an "event snippet", in a page-load
 * and a click variant, with the same `send_to`:
 *
 *   gtag('event', 'conversion', { send_to: 'AW-…/…' })
 *
 * The page-load variant is for a thank-you page, which this site has not (the
 * forms answer in place), and in the <head> it would count every page view as
 * a lead. A form is reported another way: lib/leadEvent.ts pushes
 * `generate_lead` and a tag in the GTM container does the counting, so a form
 * is not also reported from here, which would count it twice.
 *
 * A click has no such tag in the container, so it is reported from here.
 * Not counted: the "Начать проект" buttons (a step towards a form, not yet a
 * contact) and the internship application.
 *
 * What Google's click snippet does besides the call is left out on purpose:
 * its `event_callback` navigates to the link once Google has answered, and its
 * `return false` stops the link until then. With an ad blocker the answer
 * never comes and the link would stay dead. Nothing here needs it anyway: an
 * e-mail or phone link hands over to an app, and Telegram opens in a new tab,
 * so no click leaves the page.
 *
 * The Google tag that picks the call up is the one in
 * components/GoogleTagManager (SecondaryGoogleTagManager), which shares this
 * `dataLayer`. The hosts it reports to are in the CSP in next.config.js.
 */
export const ADS_CONVERSION_CONTACT = 'AW-18565782280/oeosCKWmzbUdEIi27ZRF'

/**
 * Google's own `gtag()`, as its snippet defines it. The tag tells a command
 * from plain data by the pushed value being an `arguments` object, not an
 * array, which is why this is not a one-line `dataLayer.push([...])`.
 */
function gtag(..._args: unknown[]): void {
  // eslint-disable-next-line prefer-rest-params
  dataLayer().push(arguments)
}

/**
 * Report one "Контакт" conversion for a click on a way to reach the studio.
 *
 * Whether the visitor accepted the cookie banner is not decided here, as in
 * lib/leadEvent.ts: the container's Consent Mode decides what the tag may do.
 */
export function reportContactConversion(): void {
  if (typeof window === 'undefined') return

  // Not from `next dev`: someone clicking around on their own machine is
  // not a contact, and Google would count it as one.
  if (process.env.NODE_ENV !== 'production') return

  try {
    gtag('event', 'conversion', { send_to: ADS_CONVERSION_CONTACT })
  } catch {
    // A click must never fail because of the tracking.
  }
}
