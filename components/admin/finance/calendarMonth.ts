'use client'

import { monthOfDate } from '@/lib/finance/calendar'

/**
 * The month the Calendar tab is looking at.
 *
 * Shared by the dashboard chart (which links into the tab) and the tab itself,
 * so clicking July on the chart and then opening the tab directly can't land
 * on different months. localStorage is the memory; the `?month=` parameter is
 * an explicit override for a link.
 */
export const CAL_MONTH_KEY = 'maze_finance_cal_month'

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/

/** Remembered month, or the current one. Safe to call before hydration. */
export function readCalMonth(): string {
  try {
    const m = window.localStorage.getItem(CAL_MONTH_KEY)
    if (m && MONTH_RE.test(m)) return m
  } catch { /* private mode, or no storage */ }
  return monthOfDate()
}

export function writeCalMonth(month: string): void {
  try { window.localStorage.setItem(CAL_MONTH_KEY, month) } catch { /* ignore */ }
}

export function isValidMonth(m: string | null | undefined): m is string {
  return !!m && MONTH_RE.test(m)
}

/** The Calendar tab's URL for a given month. */
export function calendarHref(month: string): string {
  return `/admin/finance/calendar?month=${month}`
}
