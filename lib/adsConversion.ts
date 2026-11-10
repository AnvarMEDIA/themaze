import { readConsent } from '@/lib/consent'

/**
 * The Google Ads conversion "Контакт": someone has got in touch with the studio.
 *
 * Google hands this over as an "event snippet" in two variants, with the same
 * `send_to`:
 *
 *   page load: gtag('event', 'conversion', { send_to: 'AW-…/…' }), for the
 *     thank-you page that follows a conversion. This site has none (the forms
 *     answer in place), and in the <head> it would count every page view as a
 *     lead.
 *   click: the same call inside gtag_report_conversion(url), for a chosen link
 *     or button.
 *
 * Both are this one call, made at the moments that really are a contact:
 *   - a form the server has accepted: components/contact/ContactForm and
 *     components/brief/BriefForm. It is counted when the server says yes, not
 *     when the button is clicked, so an empty or refused submission is not a
 *     lead;
 *   - a click on the studio's e-mail, phone or Telegram link:
 *     components/ContactClickTracker.
 * Not counted: the internship application (a job application, not a client)
 * and the "Начать проект" buttons (a step towards a form, not yet a contact).
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
 * Report one "Контакт" conversion. Call it at the moment of the contact (see
 * above); it decides for itself whether this is a visit that may be counted.
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
