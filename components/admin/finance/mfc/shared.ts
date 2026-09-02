'use client'

import { resolvePeriod, type Period } from '@/lib/finance/period'
import type { MfcCategory } from '@/lib/mfc/types'
import type { PeriodValue } from '../PeriodPicker'

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

/**
 * Where to send someone whose finance session has lapsed, and how to get them
 * back afterwards.
 *
 * The vault is shared with Finance, so the door is the same one — but MFC is
 * its own section now, and being dropped into the studio's books after typing
 * a password is a small betrayal of what you were doing.
 */
export function unlockHref(from?: string): string {
  const next = from ?? (typeof window === 'undefined' ? '' : window.location.pathname)
  return next ? `/admin/finance/unlock?next=${encodeURIComponent(next)}` : '/admin/finance/unlock'
}

/* ── reporting window ───────────────────────────────────────────────────── */

/**
 * Turn the picker's value into a window with real dates in it.
 *
 * The picker only records WHICH preset is selected — `from` and `to` stay
 * empty until someone opens the custom range. Two things went wrong with
 * that. Passing it to `inPeriod` filtered nothing, because an empty bound
 * means "unbounded", so every preset on the expenses screen listed the whole
 * ledger. And sending the bare preset name to the API let a UTC server decide
 * what "this month" means, which is the previous month for the first five
 * hours of every Tashkent day.
 *
 * Resolving here fixes both: the browser knows what day it is where the user
 * is, and the resolved dates are what both the filter and the API get.
 */
export function resolveWindow(v: PeriodValue, now: Date = new Date()): Period {
  if (v.preset === 'custom') return { from: v.from, to: v.to, preset: 'custom' }
  return resolvePeriod(v.preset, now)
}

/**
 * The query string for a resolved window. Carries the dates, the preset that
 * produced them (so the server can still step back one calendar month for the
 * "vs previous period" figure) and the browser's own date.
 */
export function windowQuery(w: Period, now: Date = new Date()): string {
  const q = new URLSearchParams()
  if (w.from) q.set('from', w.from)
  if (w.to) q.set('to', w.to)
  q.set('preset', w.preset)
  q.set('today', todayIso(now))
  return q.toString()
}
