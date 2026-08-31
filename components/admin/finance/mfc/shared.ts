'use client'

import type { MfcCategory } from '@/lib/mfc/types'

/**
 * A category's label in the panel's current language, falling back to the
 * other one rather than rendering an empty chip — `nameRu` is optional, and a
 * blank row is worse than a row in the wrong language.
 */
export function catLabel(
  c: { name: string; nameRu: string } | undefined | null,
  lang: string,
  fallback: string,
): string {
  if (!c) return fallback
  const ru = c.nameRu?.trim()
  const en = c.name?.trim()
  return (lang === 'ru' ? ru || en : en || ru) || fallback
}

/** Today / yesterday as calendar strings, read with LOCAL fields. */
export function todayIso(now: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`
}

export function yesterdayIso(now: Date = new Date()): string {
  const d = new Date(now)
  d.setDate(d.getDate() - 1)
  return todayIso(d)
}

/** "Today" / "Yesterday" / 14 Mar — a date a person reads, not an ISO string. */
export function friendlyDate(
  date: string,
  locale: string,
  labels: { today: string; yesterday: string },
  now: Date = new Date(),
): string {
  if (date === todayIso(now)) return labels.today
  if (date === yesterdayIso(now)) return labels.yesterday
  // Built from the parts, never `new Date(date)` — that parses as UTC midnight
  // and can render the previous day west of Greenwich.
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(locale, { day: 'numeric', month: 'short' })
}

export const activeCategories = (rows: MfcCategory[]): MfcCategory[] =>
  rows.filter((c) => !c.archived)
