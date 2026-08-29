/**
 * Pure money helpers — client-safe (imported by both API and React).
 */
import { CURRENCIES, type Currency, type FinanceSettings, type FinanceTransaction } from './types'

export const CURRENCY_META: Record<Currency, { symbol: string; label: string; decimals: number }> = {
  UZS: { symbol: 'so’m', label: 'Uzbek so’m', decimals: 0 },
  USD: { symbol: '$',          label: 'US Dollar',       decimals: 2 },
  EUR: { symbol: '€',     label: 'Euro',            decimals: 2 },
  RUB: { symbol: '₽',     label: 'Russian Ruble',   decimals: 2 },
}

export function isCurrency(v: unknown): v is Currency {
  return typeof v === 'string' && (CURRENCIES as readonly string[]).includes(v)
}

/** Round to the currency's natural precision (UZS whole, others 2dp). */
export function roundMoney(amount: number, currency: Currency): number {
  const d = CURRENCY_META[currency].decimals
  const f = 10 ** d
  return Math.round((amount + Number.EPSILON) * f) / f
}

/**
 * Format an amount with its currency. Uses Intl where possible; UZS is shown
 * with a trailing "so'm" because the ISO symbol is unfamiliar locally.
 */
export function formatMoney(
  amount: number,
  currency: Currency,
  opts: { locale?: string; compact?: boolean } = {},
): string {
  const { locale = 'en-US', compact = false } = opts
  const { decimals } = CURRENCY_META[currency]
  // In compact notation the currency's own precision must not be applied:
  // UZS has 0 decimals, so pinning maximumFractionDigits to it would render
  // 1,600,000 as "2M" (and 1,499,999 as "1M"). Allow one decimal instead.
  const nf = new Intl.NumberFormat(locale, {
    minimumFractionDigits: compact ? 0 : decimals,
    maximumFractionDigits: compact ? 1 : decimals,
    notation: compact ? 'compact' : 'standard',
  })
  const num = nf.format(amount)
  // UZS symbol is unfamiliar; spell it out, localised (so'm / сум).
  if (currency === 'UZS') return `${num} ${locale.startsWith('ru') ? 'сум' : 'so’m'}`
  return `${CURRENCY_META[currency].symbol}${num}`
}

/**
 * Convert an amount into the settings' base currency using stored rates.
 * `rates[c]` = value of 1 unit of currency `c` in base currency.
 * The base currency itself has an implicit rate of 1. Unknown rate → 0
 * contribution (surfaced elsewhere so the user knows to set it).
 */
export function toBase(amount: number, currency: Currency, settings: FinanceSettings): number {
  if (currency === settings.baseCurrency) return amount
  const rate = settings.rates[currency]
  if (!rate || rate <= 0) return 0
  return amount * rate
}

/**
 * Value of 1 unit of `currency` in the base currency, or null when unknown.
 * Null (rather than 0) so callers must decide what to do about a missing rate
 * instead of silently counting the money as nothing.
 */
export function rateOf(currency: Currency, settings: FinanceSettings): number | null {
  if (currency === settings.baseCurrency) return 1
  const rate = settings.rates[currency]
  return rate && rate > 0 ? rate : null
}

/**
 * Convert between any two currencies via the base currency.
 * Returns null when either side has no usable rate.
 */
export function convert(
  amount: number,
  from: Currency,
  to: Currency,
  settings: FinanceSettings,
): number | null {
  if (from === to) return amount
  const f = rateOf(from, settings)
  const t = rateOf(to, settings)
  if (f === null || t === null) return null
  return (amount * f) / t
}

/**
 * The base-currency value of one ledger row — the ONE place a transaction is
 * converted, so every screen agrees and none of them drift with the market.
 *
 * Order of authority:
 *   1. same currency as the base → the amount itself, exactly.
 *   2. a rate LOCKED on the row for this base → amount × that rate. Fixed
 *      forever: this is what the money was worth on the day it moved.
 *   3. otherwise → today's rate, and `locked: false` so the caller can say so.
 *
 * A rate locked against a DIFFERENT base (the studio switched from som to
 * dollars) is deliberately ignored: it answers a question nobody asked.
 */
export function txBase(
  t: Pick<FinanceTransaction, 'amount' | 'currency' | 'fxRate' | 'fxBase'>,
  settings: FinanceSettings,
): { value: number | null; locked: boolean } {
  if (t.currency === settings.baseCurrency) return { value: t.amount, locked: true }
  if (t.fxRate && t.fxRate > 0 && t.fxBase === settings.baseCurrency) {
    return { value: t.amount * t.fxRate, locked: true }
  }
  const live = rateOf(t.currency, settings)
  return { value: live === null ? null : t.amount * live, locked: false }
}

/** `txBase` for callers that only need the number; unconvertible reads as 0. */
export function txBaseValue(
  t: Pick<FinanceTransaction, 'amount' | 'currency' | 'fxRate' | 'fxBase'>,
  settings: FinanceSettings,
): number {
  return txBase(t, settings).value ?? 0
}

/** Rows whose base value still floats with the market — nothing locked yet. */
export function unlockedRows<T extends Pick<FinanceTransaction, 'amount' | 'currency' | 'fxRate' | 'fxBase'>>(
  txns: T[],
  settings: FinanceSettings,
): T[] {
  return txns.filter((t) => !txBase(t, settings).locked)
}

/** Whether every non-base currency present has a usable rate. */
export function missingRates(currencies: Currency[], settings: FinanceSettings): Currency[] {
  return Array.from(new Set(currencies)).filter((c) => rateOf(c, settings) === null)
}

export const DEFAULT_FINANCE_SETTINGS: FinanceSettings = {
  baseCurrency: 'UZS',
  // Fallback rates (value of 1 unit in UZS) used only if CBU is unreachable
  // and the admin has switched auto-rates off. Live rates come from the CBU.
  rates: { USD: 12650, EUR: 13700, RUB: 140 },
  autoRates: true,
  updatedAt: '1970-01-01T00:00:00.000Z',
}
