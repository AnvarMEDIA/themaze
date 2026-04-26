/**
 * Cookie / analytics consent — client-side helpers.
 *
 * State lives in localStorage under `STORAGE_KEY`. Three values:
 *   - 'accepted'  — user consented; analytics should run.
 *   - 'rejected'  — user opted out; only strictly-necessary cookies allowed.
 *   - null        — user has not chosen yet; show the banner.
 *
 * Components subscribe to changes via the `EVENT` custom event.
 */

export type ConsentValue = 'accepted' | 'rejected'

export const STORAGE_KEY = 'maze_cookie_consent'
export const EVENT       = 'maze:consent-change'

export function readConsent(): ConsentValue | null {
  if (typeof window === 'undefined') return null
  try {
    const v = window.localStorage.getItem(STORAGE_KEY)
    return v === 'accepted' || v === 'rejected' ? v : null
  } catch {
    return null
  }
}

export function setConsent(next: ConsentValue) {
  try {
    window.localStorage.setItem(STORAGE_KEY, next)
  } catch {
    /* localStorage may be blocked in private mode */
  }
  window.dispatchEvent(new CustomEvent<ConsentValue>(EVENT, { detail: next }))
}

/** Force-reopen the banner — used by the footer "Cookie settings" link. */
export function resetConsent() {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {}
  window.dispatchEvent(new CustomEvent<ConsentValue | null>(EVENT, { detail: null }))
}
