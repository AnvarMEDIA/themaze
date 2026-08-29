/**
 * Where the money went, in a shape that answers the questions actually asked:
 * "сколько получил Ислом" and "сколько уходит на подписки".
 *
 * Two axes, both period-scoped:
 *   - by KIND    — payroll, rent, subscriptions… the closed taxonomy
 *   - by PAYEE   — within a kind, who received it
 *
 * Unclassified rows get their own bucket rather than being folded into
 * "other": "we have not sorted this yet" and "this is miscellaneous" are
 * different facts, and merging them hides work still to do.
 *
 * Pure and client-safe.
 */
import { txBaseValue, missingRates } from './money'
import { inPeriod, type Period } from './period'
import { payeeKey } from './expenseKind'
import type { Currency, FinanceSettings, FinanceTransaction, ExpenseKind } from './types'

export interface PayeeTotal {
  /** As typed on the most recent row — the spelling the studio last used. */
  name: string
  /** Normalised grouping key. */
  key: string
  total: number
  count: number
  /** Most recent payment date, so a dormant payee is visible as such. */
  lastDate: string
}

export interface KindTotal {
  kind: ExpenseKind | 'unclassified'
  total: number
  count: number
  /** Share of the period's total expense, 0–1. */
  share: number
  /** Who was paid under this kind, biggest first. */
  payees: PayeeTotal[]
}

export interface ExpenseBreakdown {
  baseCurrency: Currency
  period: { from: string; to: string; preset: string }
  total: number
  count: number
  kinds: KindTotal[]
  /** Everyone paid in the period, across all kinds — biggest first. */
  payees: PayeeTotal[]
  /** Expenses with no kind set yet, so the UI can offer to sort them. */
  unclassifiedCount: number
  unratedCurrencies: Currency[]
}

/** A payee bucket keyed by the normalised name, tracking the latest spelling. */
class PayeeBucket {
  private map = new Map<string, PayeeTotal>()

  add(rawName: string, value: number, date: string) {
    const key = payeeKey(rawName)
    if (!key) return
    const cur = this.map.get(key)
    if (!cur) {
      this.map.set(key, { name: rawName.trim(), key, total: value, count: 1, lastDate: date })
      return
    }
    cur.total += value
    cur.count += 1
    // Keep the spelling from the most recent row — that is the one the studio
    // is currently using, and the one they will recognise.
    if (date > cur.lastDate) { cur.lastDate = date; cur.name = rawName.trim() }
  }

  list(): PayeeTotal[] {
    // Name breaks a tie, so two equal totals don't swap places between loads.
    return [...this.map.values()].sort((a, b) => b.total - a.total || a.key.localeCompare(b.key))
  }
}

export function buildExpenseBreakdown(
  txns: FinanceTransaction[],
  settings: FinanceSettings,
  period: Period,
): ExpenseBreakdown {
  const rows = txns.filter((t) => t.type === 'expense' && inPeriod(t.date, period))

  const byKind = new Map<ExpenseKind | 'unclassified', { total: number; count: number; payees: PayeeBucket }>()
  const allPayees = new PayeeBucket()
  let total = 0
  let unclassifiedCount = 0

  for (const t of rows) {
    // Test the rate, not the converted result: a genuine zero-amount row is
    // convertible and must not be mistaken for an unknown one.
    const value = txBaseValue(t, settings)

    const kind = t.expenseKind ?? 'unclassified'
    if (!t.expenseKind) unclassifiedCount += 1

    const bucket = byKind.get(kind) ?? { total: 0, count: 0, payees: new PayeeBucket() }
    bucket.total += value
    bucket.count += 1
    total += value

    // Fall back to the free-text category as the payee label: on an
    // unclassified row that is exactly where the name has been living.
    const who = t.payee?.trim() || (kind === 'unclassified' ? t.category?.trim() : '')
    if (who) {
      bucket.payees.add(who, value, t.date)
      allPayees.add(who, value, t.date)
    }
    byKind.set(kind, bucket)
  }

  const kinds: KindTotal[] = [...byKind.entries()]
    .map(([kind, b]) => ({
      kind,
      total: b.total,
      count: b.count,
      share: total > 0 ? b.total / total : 0,
      payees: b.payees.list(),
    }))
    .sort((a, b) => b.total - a.total || String(a.kind).localeCompare(String(b.kind)))

  return {
    baseCurrency: settings.baseCurrency,
    period: { from: period.from, to: period.to, preset: period.preset },
    total,
    count: rows.length,
    kinds,
    payees: allPayees.list(),
    unclassifiedCount,
    unratedCurrencies: missingRates(rows.map((t) => t.currency), settings),
  }
}
