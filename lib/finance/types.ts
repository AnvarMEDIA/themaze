/**
 * Finance module domain types. Client-safe (no server imports) so both the
 * API layer and React components can share them.
 *
 * Money is stored as a plain number in MAJOR units (e.g. 1500.50 USD, or
 * 15000000 UZS) alongside an explicit currency code. Amounts are rounded to
 * 2 decimals on write. For a studio-scale ledger this is precise enough;
 * headline dashboard figures convert between currencies using editable rates
 * held in FinanceSettings (never a live FX feed — always transparent).
 */

export const CURRENCIES = ['UZS', 'USD', 'EUR', 'RUB'] as const
export type Currency = (typeof CURRENCIES)[number]

export const PROJECT_STATUSES = ['lead', 'active', 'completed', 'cancelled'] as const
export type ProjectStatus = (typeof PROJECT_STATUSES)[number]

export const TRANSACTION_TYPES = ['income', 'expense'] as const
export type TransactionType = (typeof TRANSACTION_TYPES)[number]

export const PAYMENT_METHODS = ['bank', 'cash', 'card', 'crypto', 'other'] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export const CLIENT_STATUSES = ['active', 'archived'] as const
export type ClientStatus = (typeof CLIENT_STATUSES)[number]

export interface FinanceClient {
  id: string
  name: string
  company: string
  email: string
  phone: string
  notes: string
  status: ClientStatus
  createdAt: string
  updatedAt: string
}

export interface FinanceProject {
  id: string
  title: string
  clientId: string | null
  amount: number
  currency: Currency
  status: ProjectStatus
  startDate: string          // ISO date (YYYY-MM-DD)
  endDate: string            // ISO date or ''
  description: string
  createdAt: string
  updatedAt: string
}

export interface FinanceTransaction {
  id: string
  type: TransactionType
  projectId: string | null
  clientId: string | null
  amount: number
  currency: Currency
  date: string               // ISO date (YYYY-MM-DD)
  method: PaymentMethod
  category: string
  note: string
  createdAt: string
  updatedAt: string
}

export interface FinanceSettings {
  baseCurrency: Currency
  /** Value of 1 unit of the keyed currency expressed in `baseCurrency`. */
  rates: Partial<Record<Currency, number>>
  /** When true, live rates from the Central Bank (CBU) override `rates`. */
  autoRates: boolean
  updatedAt: string
}

/* ── Aggregated dashboard payload (server-computed) ─────────────────────── */

export interface CurrencyTotal {
  currency: Currency
  amount: number
}

export interface MonthlyPoint {
  month: string              // YYYY-MM
  income: number             // converted to base currency
  expense: number
}

export interface ClientRevenue {
  clientId: string | null
  name: string
  total: number              // base currency
}

export interface FinanceSummary {
  baseCurrency: Currency
  generatedAt: string
  kpis: {
    revenueAllTime: number
    revenueThisYear: number
    revenueThisMonth: number
    expenseThisYear: number
    profitThisYear: number
    outstanding: number      // receivables across active/completed projects
    activeProjects: number
    totalClients: number
  }
  monthly: MonthlyPoint[]    // last 12 months, base currency
  topClients: ClientRevenue[]
  statusBreakdown: { status: ProjectStatus; count: number; value: number }[]
  recentTransactions: FinanceTransaction[]
  /** Raw revenue grouped by native currency (no conversion) for transparency. */
  revenueByCurrency: CurrencyTotal[]
}
