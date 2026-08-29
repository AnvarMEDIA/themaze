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
  /**
   * Marks a payment's role when it matters structurally. Set on the payment
   * auto-created from a project's prepayment field so the UI never has to
   * guess from the free-text, user-translatable `category`.
   */
  kind?: 'prepayment'
  /**
   * The schedule this row was posted from, when it came from one. Lets the
   * forecast tell committed spending apart from ad-hoc spending, and stops the
   * duplicate check flagging two occurrences of the same retainer.
   */
  recurringId?: string
  /**
   * Structured classification for expenses. Absent on income, and absent on
   * older rows that predate it — reports treat "not set" as its own bucket
   * rather than guessing, so nothing is silently miscounted.
   */
  expenseKind?: ExpenseKind
  /**
   * Who received the money: the team member for payroll, the vendor for a
   * subscription or rent. Stored as typed; grouped on a normalised key so
   * "Islom", "islom" and " Islom " are one person (see expenseKind.ts).
   */
  payee?: string
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

export const RECUR_INTERVALS = ['monthly', 'quarterly', 'yearly'] as const
export type RecurInterval = (typeof RECUR_INTERVALS)[number]

/**
 * A payment that repeats on a schedule — a retainer, a rent, a subscription.
 *
 * This is a TEMPLATE, not a ledger entry. Nothing reaches the books until the
 * studio posts a due occurrence: money records should never appear behind
 * someone's back, and an invoice that didn't actually get paid would quietly
 * corrupt every figure downstream.
 */
export interface FinanceRecurring {
  id: string
  title: string
  type: TransactionType
  amount: number
  currency: Currency
  clientId: string | null
  projectId: string | null
  method: PaymentMethod
  category: string
  note: string
  interval: RecurInterval
  /** First occurrence, and the day-of-month the series is anchored to. */
  startDate: string
  /** Next occurrence not yet posted. Advances as occurrences are posted. */
  nextDate: string
  /** Last date the series may run to. '' = open-ended. */
  endDate: string
  active: boolean
  createdAt: string
  updatedAt: string
}

/** A scheduled occurrence that has come due and is not yet in the ledger. */
export interface DueOccurrence {
  recurringId: string
  title: string
  type: TransactionType
  amount: number
  currency: Currency
  date: string
  daysLate: number
}

/* ── Project profitability ──────────────────────────────────────────────── */

/**
 * One project's contribution, in the BASE currency. `directCost` counts only
 * expenses explicitly linked to the project — studio overhead is deliberately
 * excluded and reported separately, because splitting rent across projects is
 * an accounting policy decision, not something to invent silently.
 */
export interface ProjectProfit {
  id: string
  title: string
  client: string
  status: ProjectStatus
  /** Agreed project value. */
  contracted: number
  /** Income received in the selected period. */
  received: number
  /** Still owed, right now (not period-scoped). */
  outstanding: number
  /** Expenses linked to this project in the selected period. */
  directCost: number
  /** received − directCost. */
  profit: number
  /** profit ÷ received, or null when nothing was received. */
  margin: number | null
  /** Currencies on linked rows that had no usable rate. */
  unconverted: Currency[]
}

export interface ProfitabilityReport {
  baseCurrency: Currency
  period: { from: string; to: string; preset: string }
  generatedAt: string
  projects: ProjectProfit[]
  totals: {
    received: number
    directCost: number
    /** Expenses with no project attached — studio overhead. */
    overhead: number
    /** Σ received − Σ directCost, before overhead. */
    grossProfit: number
    /** grossProfit − overhead. Reconciles with the dashboard's net profit. */
    netProfit: number
  }
  unratedCurrencies: Currency[]
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

/**
 * What KIND of spending a row is. A closed set, never typed by hand, so
 * reports can group by it reliably — unlike `category`, which is free text and
 * ends up holding a person's name on one row and "Интернет" on the next.
 *
 * `payroll` covers pay to the team whether or not it is on a schedule; a
 * studio that pays when a job lands still needs to see what each person got.
 */
export const EXPENSE_KINDS = [
  'payroll',
  'contractor',
  'rent',
  'utilities',
  'subscriptions',
  'equipment',
  'marketing',
  'taxes',
  'office',
  'travel',
  'other',
] as const
export type ExpenseKind = (typeof EXPENSE_KINDS)[number]

export interface ClientRevenue {
  clientId: string | null
  name: string
  total: number              // base currency
}

export interface ExpenseCategory {
  category: string
  total: number
}

/** Spending grouped by the structured taxonomy, for the selected period. */
export interface ExpenseKindTotal {
  kind: ExpenseKind | 'unclassified'
  total: number
  count: number
}

/** A signed project past its end date with money still owed. */
export interface OverdueProject {
  id: string
  title: string
  client: string
  /** Unpaid balance, in the base currency. */
  outstanding: number
  dueDate: string
  daysLate: number
}

export interface FinanceSummary {
  baseCurrency: Currency
  generatedAt: string
  /** The reporting window the period figures were computed for. */
  period: { from: string; to: string; preset: string }
  /** Currencies in use that have no usable rate — their amounts count as 0. */
  unratedCurrencies: Currency[]
  /**
   * Effective rates (value of 1 unit in `baseCurrency`) used for the figures
   * above, so the UI can re-express the same totals in other currencies
   * without a second request or a second source of truth.
   */
  rates: Partial<Record<Currency, number>>
  /** Where those rates came from, for labelling. */
  ratesSource: 'cbu' | 'manual'
  /** True total, unlike `recentTransactions` which is capped for display. */
  totalTransactions: number
  kpis: {
    /** Income received inside the selected period. */
    revenue: number
    /** Spending inside the selected period. */
    expense: number
    /** revenue − expense for the period. */
    profit: number
    /** Income ever received, regardless of period. */
    revenueAllTime: number
    /** Receivables right now — a point-in-time figure, not period-scoped. */
    outstanding: number
    /** The part of `outstanding` that is already past its due date. */
    overdue: number
    activeProjects: number
    totalClients: number
  }
  /**
   * The same period figures for the window immediately before this one, so the
   * dashboard can show direction of travel. Null when there is nothing to
   * compare against ("all time", or an open-ended custom range).
   */
  previous: {
    from: string
    to: string
    revenue: number
    expense: number
    profit: number
  } | null
  /** Scheduled payments that have come due and are not yet in the ledger. */
  dueRecurring: DueOccurrence[]
  monthly: MonthlyPoint[]    // last 12 months, base currency (trend, not period)
  /** Every client with income in the period, biggest first. */
  clients: ClientRevenue[]
  statusBreakdown: { status: ProjectStatus; count: number; value: number }[]
  expenseCategories: ExpenseCategory[]
  /**
   * The same spending grouped by `expenseKind`. Empty until rows are
   * classified, so the dashboard can fall back to the free-text mix rather
   * than showing an empty panel to a studio that hasn't sorted anything yet.
   */
  expenseKinds: ExpenseKindTotal[]
  overdueProjects: OverdueProject[]
  recentTransactions: FinanceTransaction[]
  /** Raw revenue grouped by native currency (no conversion) for transparency. */
  revenueByCurrency: CurrencyTotal[]
}
