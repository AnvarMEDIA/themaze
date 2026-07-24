/**
 * Pure money helpers — client-safe (imported by both API and React).
 */
import { CURRENCIES, type Currency, type FinanceSettings } from './types'

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

/** Whether every non-base currency present has a usable rate. */
export function missingRates(currencies: Currency[], settings: FinanceSettings): Currency[] {
  return currencies.filter(
    (c) => c !== settings.baseCurrency && !(settings.rates[c] && settings.rates[c]! > 0),
  )
}

export const DEFAULT_FINANCE_SETTINGS: FinanceSettings = {
  baseCurrency: 'UZS',
  // Fallback rates (value of 1 unit in UZS) used only if CBU is unreachable
  // and the admin has switched auto-rates off. Live rates come from the CBU.
  rates: { USD: 12650, EUR: 13700, RUB: 140 },
  autoRates: true,
  updatedAt: '1970-01-01T00:00:00.000Z',
}
