/**
 * Locking the exchange rate onto a transaction at the moment it is recorded.
 *
 * A payment of $1,000 received when the dollar stood at 11,900 was worth
 * 11,900,000 som. It is still worth 11,900,000 som next year, whatever the
 * dollar does. Converting at today's rate instead makes every historical
 * figure move under the studio's feet — last year's revenue, last quarter's
 * profit, the report they showed their accountant — and no statement ever
 * reproduces. So the rate is captured once, stored on the row, and never
 * recomputed.
 *
 * Server-only: reaches the CBU archive.
 */
import { getCbuRatesOn } from './cbuRates'
import { getFinanceSettings } from './settings'
import type { Currency, FinanceTransaction } from './types'

export interface FxLock {
  fxRate: number
  fxBase: Currency
  fxDate: string
  fxSource: 'cbu' | 'manual'
}

/**
 * Work out the lock for one row, or null when none is needed or possible.
 *
 * Null means one of three things, and all three are fine:
 *   - the row is already in the base currency, so there is nothing to convert;
 *   - CBU could not be reached, so the honest answer is "not locked yet"
 *     rather than a rate invented from today's market;
 *   - the studio has auto-rates off and set the rate by hand, in which case
 *     their own figure is locked instead.
 */
export async function computeFxLock(
  input: Pick<FinanceTransaction, 'currency' | 'date'>,
  baseCurrency: Currency,
  manualRates: Partial<Record<Currency, number>>,
  autoRates: boolean,
): Promise<FxLock | null> {
  if (input.currency === baseCurrency) return null

  if (autoRates) {
    const dated = await getCbuRatesOn(input.date)
    // CBU quotes everything against the som, so a non-som base needs both legs.
    const perUzs = { UZS: 1, ...(dated?.rates ?? {}) } as Partial<Record<Currency, number>>
    const from = perUzs[input.currency]
    const to = perUzs[baseCurrency]
    if (dated && from && from > 0 && to && to > 0) {
      return { fxRate: from / to, fxBase: baseCurrency, fxDate: dated.date, fxSource: 'cbu' }
    }
  }

  // The studio's own rate. Dated to the transaction, because that is the day
  // it is being applied to — it is their statement about that day.
  const manual = manualRates[input.currency]
  if (manual && manual > 0) {
    return { fxRate: manual, fxBase: baseCurrency, fxDate: input.date, fxSource: 'manual' }
  }
  return null
}

/** `computeFxLock` reading the studio's current settings itself. */
export async function lockFor(
  input: Pick<FinanceTransaction, 'currency' | 'date'>,
): Promise<FxLock | null> {
  const s = await getFinanceSettings()
  return computeFxLock(input, s.baseCurrency, s.rates ?? {}, s.autoRates)
}

/**
 * Whether an edit invalidates the rate already locked on a row.
 *
 * Only the currency and the date determine it. Correcting a typo in the date
 * genuinely changes which day's rate applies; editing the note does not, and
 * must not silently re-price a row that has been reported on.
 */
export function lockNeedsRefresh(
  before: Pick<FinanceTransaction, 'currency' | 'date'>,
  patch: Partial<Pick<FinanceTransaction, 'currency' | 'date'>>,
): boolean {
  if (patch.currency !== undefined && patch.currency !== before.currency) return true
  if (patch.date !== undefined && patch.date !== before.date) return true
  return false
}
