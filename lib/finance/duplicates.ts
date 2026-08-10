/**
 * Likely double-entered payments.
 *
 * A studio records the same invoice twice more often than it records two
 * genuinely identical payments days apart — but not never, so this FLAGS and
 * never blocks or deletes. The books stay whatever the studio says they are;
 * this only makes the suspicious pair easy to find.
 *
 * Pure and client-safe.
 */
import { roundMoney } from './money'
import type { FinanceTransaction } from './types'

/** How many days apart two identical amounts can be and still look accidental. */
export const DUPLICATE_WINDOW_DAYS = 3

const dayNumber = (date: string) =>
  Math.round(Date.parse(`${date.slice(0, 10)}T00:00:00Z`) / 86_400_000)

/**
 * Rows that look like copies of each other, keyed by transaction id and
 * listing the ids of its twins.
 *
 * Two rows match when the type, currency, amount, and project all agree and
 * the dates are within `windowDays`. Rows posted from the same recurring
 * schedule are never paired: repeating on a schedule is the point of them.
 */
export function findDuplicates(
  txns: FinanceTransaction[],
  windowDays: number = DUPLICATE_WINDOW_DAYS,
): Map<string, string[]> {
  // Bucket by everything that must match exactly, so only same-bucket rows are
  // compared pairwise — the date window is the only fuzzy part.
  const buckets = new Map<string, FinanceTransaction[]>()
  for (const t of txns) {
    if (!t.date) continue
    const key = [
      t.type,
      t.currency,
      roundMoney(t.amount, t.currency),
      t.projectId ?? '',
    ].join('|')
    buckets.set(key, [...(buckets.get(key) ?? []), t])
  }

  const out = new Map<string, string[]>()
  const link = (a: string, b: string) => {
    out.set(a, [...(out.get(a) ?? []), b])
    out.set(b, [...(out.get(b) ?? []), a])
  }

  for (const rows of buckets.values()) {
    if (rows.length < 2) continue
    const sorted = [...rows].sort((x, y) => x.date.localeCompare(y.date))
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const a = sorted[i]
        const b = sorted[j]
        // Sorted by date, so once one is out of range every later one is too.
        if (dayNumber(b.date) - dayNumber(a.date) > windowDays) break
        // Two occurrences of one schedule are intentional, however close.
        if (a.recurringId && a.recurringId === b.recurringId) continue
        link(a.id, b.id)
      }
    }
  }
  return out
}

/** Ids of every row that has at least one twin. */
export function duplicateIds(
  txns: FinanceTransaction[],
  windowDays: number = DUPLICATE_WINDOW_DAYS,
): Set<string> {
  return new Set(findDuplicates(txns, windowDays).keys())
}
