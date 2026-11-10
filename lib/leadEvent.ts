import { dataLayer } from '@/lib/dataLayer'

/**
 * The forms a client writes through. The internship application is a job
 * application, not a lead, and is not one of them.
 */
export type LeadForm = 'contact' | 'brief'

/**
 * A client's form has been sent and the server has accepted it: tell Google
 * Tag Manager.
 *
 * The container has a tag waiting for this event, the one that reports the
 * Google Ads conversion "Контакт" (set up in GTM, not here). The names are
 * what that tag listens for, `generate_lead` being GA4's own name for it:
 * change them there as well.
 *
 * The site does not tell Google directly (see lib/adsConversion.ts for the one
 * place that does), or the form would be counted twice: here and by the tag.
 *
 * Whether the visitor accepted the cookie banner is not decided here. This is
 * only a message on the data layer; what the tags in the container may do
 * with it, with cookies or without, is for the container's Consent Mode to
 * decide. (The banner does not pass its choice on to Google today.)
 */
export function reportLead(form: LeadForm): void {
  if (typeof window === 'undefined') return

  // Not from `next dev`: someone trying the form on their own machine is
  // not a lead, and the container would count it as one.
  if (process.env.NODE_ENV !== 'production') return

  try {
    dataLayer().push({ event: 'generate_lead', form_name: form })
  } catch {
    // A form that has just been sent must never fail because of the tracking.
  }
}
