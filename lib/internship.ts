/**
 * The studio's internship, the parts that are safe anywhere: types, the
 * candidate statuses and their names, the default switch. The store lives in
 * lib/internshipStore.ts so a client component can import this file without
 * pulling the database driver into the browser.
 */

/** Where a candidate stands, in the order the studio moves them along. */
export const INTERN_STATUSES = ['new', 'test', 'interview', 'intern', 'hired', 'rejected'] as const
export type InternStatus = (typeof INTERN_STATUSES)[number]

export const INTERN_STATUS_LABELS: Record<InternStatus, string> = {
  new:       'Новая',
  test:      'Тестовое',
  interview: 'Собеседование',
  intern:    'Стажёр',
  hired:     'В штате',
  rejected:  'Отказ',
}

export interface InternApplication {
  id:          string
  name:        string
  phone:       string
  email?:      string
  telegram?:   string
  city?:       string
  portfolio:   string
  about:       string
  /** The language of the page they applied from: the one to answer in. */
  locale?:     'en' | 'ru'
  createdAt:   string
  status:      InternStatus
  /** The studio's own note on the candidate. Never leaves the admin. */
  note?:       string
  /** When the Telegram alert went out. Absent = never delivered. */
  notifiedAt?: string
  /** Why the alert failed, so a broken bot is visible instead of silent. */
  notifyError?: string
}

export interface InternshipSettings {
  /** Whether the intake is open: the menu link, the form, the job posting. */
  open: boolean
  /** The day the current intake opened (YYYY-MM-DD): the posting's date. */
  openedAt: string
}

/** Open from the day it was announced. */
export const DEFAULT_INTERNSHIP: InternshipSettings = { open: true, openedAt: '2026-11-09' }

/**
 * A Telegram username out of whatever was typed: "@name", "name",
 * "t.me/name" or the full link. Undefined when it is not one (a phone number,
 * a sentence), so the caller shows the text as typed rather than a dead link.
 */
export function telegramUsername(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined
  const v = raw.trim()
    .replace(/^(?:https?:\/\/)?(?:www\.)?(?:t(?:elegram)?\.me)\//i, '')
    .replace(/^@/, '')
    .replace(/[/?#].*$/, '')
  return /^[A-Za-z][A-Za-z0-9_]{3,31}$/.test(v) ? v : undefined
}

/** A link as a person reads it: no scheme, no "www.", no trailing slash, no %-escapes. */
export function displayUrl(url: string): string {
  const short = url.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/$/, '')
  try {
    return decodeURI(short)
  } catch {
    return short
  }
}
