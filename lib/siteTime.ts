/**
 * The studio's clock, for every date and time a person reads.
 *
 * Without a time zone, Intl formats in the zone of whatever machine runs it.
 * On Vercel that is UTC, so a brief sent at 00:19 in Tashkent printed as
 * "11 November, 19:19", the evening before; in a browser it is the viewer's
 * own zone, which is right for the owner at home and wrong on a trip. Naming
 * the zone makes the server, the browser and the PDF agree with the Telegram
 * message and the daily report.
 *
 * Client-safe: no Node APIs, so pages, components and lib code can share it.
 */

export const SITE_TZ = 'Asia/Tashkent'

/**
 * Format an instant (an ISO string, a timestamp or a Date) as the studio's
 * clock shows it. A date-only string ("2026-11-12") is midnight UTC, which is
 * 05:00 in Tashkent: still the same calendar day.
 *
 * Returns the input as given if it is not a date, rather than "Invalid Date".
 */
export function formatSiteTime(
  value: string | number | Date,
  locale: string,
  options: Intl.DateTimeFormatOptions,
): string {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat(locale, { ...options, timeZone: SITE_TZ }).format(date)
}
