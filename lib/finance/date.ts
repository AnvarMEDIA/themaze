/**
 * Date helpers for the finance forms. Client-safe.
 *
 * Transaction/project dates are calendar dates ("YYYY-MM-DD"), not instants,
 * so they must be derived from the LOCAL calendar. `toISOString()` converts to
 * UTC first, which in Tashkent (UTC+5) makes every entry between 00:00 and
 * 05:00 default to yesterday.
 */

/** Today's date in the viewer's own timezone, as YYYY-MM-DD. */
export function todayLocal(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
