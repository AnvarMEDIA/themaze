/**
 * MFC — My Finance Control. Personal spending, kept deliberately apart from
 * the studio's ledger.
 *
 * The company books answer "did the studio make money"; this answers "where
 * did MY money go". Mixing them would corrupt both: a personal taxi is not a
 * business cost, and a client payment is not pocket money. So MFC has its own
 * store keys, its own categories and its own screens — and no income at all,
 * because there is only one source of it and it already lives in Finance.
 *
 * What IS shared: the base currency, the exchange rates, and the rule that a
 * foreign-currency row is worth what it was worth on the day it was spent
 * (see lib/finance/money.ts → txBase). One person, one currency setup.
 *
 * Client-safe: no server imports.
 */
import type { Currency, PaymentMethod } from '../finance/types'

export type { Currency, PaymentMethod }

/**
 * A spending category — the thing the dashboard groups by.
 *
 * Categories are data, not code: the studio's owner adds "Дача" or "Кофе"
 * without a deploy. The defaults in defaults.ts are a starting point, not a
 * closed set.
 */
export interface MfcCategory {
  id: string
  /** As typed, in whichever language it was typed. */
  name: string
  /** Optional second label, so one category can read правильно in both. */
  nameRu: string
  /** A single emoji. Emoji because it needs no icon font and reads at 16px. */
  icon: string
  /**
   * What people write when they mean this category — "такси", "кофе",
   * "бензин". Comma- or space-separated, either language.
   *
   * Category titles are nouns for a filing cabinet; messages are what was
   * actually bought. Nobody types "Транспорт", they type "такси". These are
   * how a Telegram message finds its category, and the bot appends to them
   * whenever a category is chosen by hand for a word it did not recognise —
   * so the list is both editable and self-teaching.
   */
  keywords: string
  /**
   * Identity colour, as an index into MFC_CHIP_SLOTS. Stored as a slot rather
   * than a hex so the palette can be re-stepped without touching stored data —
   * and so a category can never be given an unvalidated colour.
   */
  colorSlot: number
  /**
   * Spending cap for a calendar month, in the base currency. 0 = no budget.
   * A budget is a question ("am I over?"), so it is optional per category
   * rather than a wall the app puts up.
   */
  monthlyLimit: number
  /**
   * Hidden from the pickers but kept on old rows. Deleting a category the user
   * has spent against would silently rewrite history; archiving does not.
   */
  archived: boolean
  /** Manual order in the quick-add grid — most-used first, by hand. */
  order: number
  createdAt: string
  updatedAt: string
}

/**
 * One thing bought.
 *
 * There is no `type` field. Every row here is money going out; that is the
 * whole premise, and a type field would only invite the mistake.
 */
export interface MfcExpense {
  id: string
  /** Null when the category was deleted outright, or on an unsorted import. */
  categoryId: string | null
  amount: number
  currency: Currency
  /** Calendar date, YYYY-MM-DD. Compared as a string; never parsed as a Date. */
  date: string
  /** Free text — "обед с Аброром", a shop name, a receipt number. */
  note: string
  method: PaymentMethod
  /**
   * The rate locked at the moment it was recorded — same discipline as the
   * company ledger. $20 spent when the dollar stood at 11,900 stays 238,000
   * som forever, so last year's totals never move. See lib/finance/fxLock.
   */
  fxRate?: number
  fxBase?: Currency
  fxDate?: string
  fxSource?: 'cbu' | 'manual'
  createdAt: string
  updatedAt: string
}

/* ── Dashboard payload ──────────────────────────────────────────────────── */

/** One category's slice of the period. */
export interface MfcCategoryTotal {
  categoryId: string | null
  name: string
  nameRu: string
  icon: string
  colorSlot: number
  /** Base currency. */
  total: number
  count: number
  /** total ÷ period total, 0–1. */
  share: number
  /** Monthly cap in base currency, 0 when none is set. */
  monthlyLimit: number
}

/**
 * Spending in one slice of time. `key` is YYYY-MM-DD for a period short
 * enough to read day by day, YYYY-MM beyond that — 365 daily columns is a
 * smear, not a chart.
 */
export interface MfcBucket {
  key: string
  total: number
  count: number
}

/** A category's month against its cap. Only categories WITH a cap appear. */
export interface MfcBudgetLine {
  categoryId: string
  name: string
  nameRu: string
  icon: string
  colorSlot: number
  limit: number
  spent: number
  /** spent ÷ limit. Can exceed 1 — that is the point of showing it. */
  ratio: number
}

export interface MfcSummary {
  baseCurrency: Currency
  /**
   * The rates the figures were computed with, so the client can price a row
   * the same way the server did without a second request or a second source
   * of truth.
   */
  rates: Partial<Record<Currency, number>>
  generatedAt: string
  period: { from: string; to: string; preset: string }
  /** Total spent in the period, base currency. */
  total: number
  count: number
  /** Mean per day across the days the period actually covers. */
  dailyAverage: number
  /** The biggest single expense of the period, for the "what was that?" moment. */
  largest: { amount: number; date: string; note: string; categoryId: string | null } | null
  /**
   * The same window immediately before this one. Null for "all time", where
   * there is nothing to compare against.
   */
  previous: { from: string; to: string; total: number } | null
  categories: MfcCategoryTotal[]
  /** Whether `buckets` is keyed by day or by month. */
  granularity: 'day' | 'month'
  buckets: MfcBucket[]
  /**
   * Budgets are always measured against the CURRENT calendar month, whatever
   * period is on screen: a monthly cap compared with a quarter's spending
   * would read as wildly over every time.
   */
  budgets: MfcBudgetLine[]
  budgetMonth: string
  recent: MfcExpense[]
  /** Currencies used in the period that have no usable rate — counted as 0. */
  unratedCurrencies: Currency[]
  /** Rows whose base value still floats with the market. */
  unlockedFxCount: number
}
