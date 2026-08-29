import { NextResponse } from 'next/server'
import { requireFinance } from '@/lib/finance/guard'
import { listTransactions, updateTransaction } from '@/lib/finance/data'
import { getFinanceSettings } from '@/lib/finance/settings'
import { unlockedRows } from '@/lib/finance/money'
import { computeFxLock } from '@/lib/finance/fxLock'
import type { Currency } from '@/lib/finance/types'

export const dynamic = 'force-dynamic'

/** One request will not sit fetching the CBU for minutes on end. */
const MAX_PER_RUN = 200

/**
 * Settling the exchange rate on rows recorded before rates were locked.
 *
 * Until a row carries the rate from its own day, its base-currency value is
 * recomputed from today's market every time a report is opened — which is
 * exactly the drift this endpoint exists to stop. Backfilling reads the CBU's
 * published rate for each row's date and writes it in, after which that row's
 * value never changes again.
 *
 * A date the CBU cannot supply is LEFT ALONE and reported. A rate we could not
 * obtain must stay unknown rather than become a guess in the books.
 */
export async function GET() {
  const blocked = await requireFinance()
  if (blocked) return blocked

  const [txns, settings] = await Promise.all([listTransactions(), getFinanceSettings()])
  const rows = unlockedRows(txns, settings)

  const byCurrency: Partial<Record<Currency, number>> = {}
  for (const t of rows) byCurrency[t.currency] = (byCurrency[t.currency] ?? 0) + 1
  const dates = rows.map((t) => t.date).filter(Boolean).sort()

  return NextResponse.json({
    baseCurrency: settings.baseCurrency,
    total: rows.length,
    byCurrency,
    earliest: dates[0] ?? null,
    latest: dates[dates.length - 1] ?? null,
    distinctDates: new Set(dates).size,
    maxPerRun: MAX_PER_RUN,
  })
}

export async function POST() {
  const blocked = await requireFinance()
  if (blocked) return blocked

  const [txns, settings] = await Promise.all([listTransactions(), getFinanceSettings()])
  // Oldest first: the earliest rows are the ones whose value has drifted
  // furthest, so a capped run settles the worst of it first.
  const rows = unlockedRows(txns, settings)
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
    .slice(0, MAX_PER_RUN)

  let locked = 0
  const unavailable: string[] = []

  for (const t of rows) {
    const lock = await computeFxLock(t, settings.baseCurrency, settings.rates ?? {}, settings.autoRates)
    if (!lock) { unavailable.push(t.date); continue }
    await updateTransaction(t.id, lock)
    locked += 1
  }

  const remaining = unlockedRows(await listTransactions(), settings).length

  return NextResponse.json({
    locked,
    // Dates the CBU had nothing for — deliberately left unlocked, not guessed.
    unavailableDates: [...new Set(unavailable)].sort(),
    remaining,
  })
}
