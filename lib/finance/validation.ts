import { z } from 'zod'
import {
  CURRENCIES,
  CLIENT_STATUSES,
  PROJECT_STATUSES,
  TRANSACTION_TYPES,
  PAYMENT_METHODS,
  RECUR_INTERVALS,
  type Currency,
  type ClientStatus,
  type ProjectStatus,
  type TransactionType,
  type PaymentMethod,
  type RecurInterval,
} from './types'

const str = (max: number) => z.string().trim().max(max, `Max ${max} characters`)

const currencyEnum = z.enum([...CURRENCIES] as [Currency, ...Currency[]])
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
const dateOrEmpty = z.union([dateStr, z.literal('')]).default('')

// Form selects submit '' for "none"; normalise '' | null | undefined → null.
const nullableId = z
  .union([z.string().trim().max(64), z.null()])
  .optional()
  .transform((v) => (v ? v : null))

const amount = z
  .number()
  .finite()
  .min(0, 'Amount must be zero or more')
  .max(1e15, 'Amount too large')

const emailOrEmpty = z
  .string()
  .trim()
  .max(254)
  .refine((v) => v === '' || z.string().email().safeParse(v).success, 'Invalid email')
  .default('')

/**
 * Parse a PATCH body, keeping ONLY the fields the caller actually sent.
 *
 * `.partial()` makes every key optional but does not stop a field from
 * producing a value when the key is absent: `.default()` still fires, and
 * `nullableId`'s transform still resolves undefined to null. So a plain
 * `PATCH { active: true }` parses into a full object carrying
 * `type: 'income'`, `category: ''`, `clientId: null`… and the routes' merge
 * (`{ ...stored, ...patch }`) writes all of it over real data — flipping an
 * expense to income and unlinking it from its project and client.
 *
 * Filtering against the raw input keys fixes that at the one place it can't be
 * got wrong, and stays correct no matter what validators the shapes grow later.
 */
export function parsePatch<T>(
  schema: { safeParse: (v: unknown) => z.ZodSafeParseResult<T> },
  raw: unknown,
): { success: true; data: Partial<T> } | { success: false; error: z.ZodError } {
  const parsed = schema.safeParse(raw)
  if (!parsed.success) return { success: false, error: parsed.error }
  const sent = raw && typeof raw === 'object' ? new Set(Object.keys(raw)) : new Set<string>()
  const data = Object.fromEntries(
    Object.entries(parsed.data as Record<string, unknown>).filter(([k]) => sent.has(k)),
  ) as Partial<T>
  return { success: true, data }
}

/* ── Clients ─────────────────────────────────────────────────────────────── */

export const ClientSchema = z.object({
  name:    str(120).min(1, 'Name is required'),
  company: str(120).default(''),
  email:   emailOrEmpty,
  phone:   str(40).default(''),
  notes:   str(2000).default(''),
  status:  z.enum([...CLIENT_STATUSES] as [ClientStatus, ...ClientStatus[]]).default('active'),
})
export const ClientUpdateSchema = ClientSchema.partial()

/* ── Projects ────────────────────────────────────────────────────────────── */

export const ProjectSchema = z.object({
  title:       str(200).min(1, 'Title is required'),
  clientId:    nullableId,
  amount,
  currency:    currencyEnum,
  status:      z.enum([...PROJECT_STATUSES] as [ProjectStatus, ...ProjectStatus[]]).default('active'),
  startDate:   dateOrEmpty,
  endDate:     dateOrEmpty,
  description: str(3000).default(''),
})
export const ProjectUpdateSchema = ProjectSchema.partial()

/* ── Transactions ────────────────────────────────────────────────────────── */

export const TransactionSchema = z.object({
  type:      z.enum([...TRANSACTION_TYPES] as [TransactionType, ...TransactionType[]]).default('income'),
  kind:      z.literal('prepayment').optional(),
  recurringId: z.string().trim().max(64).optional(),
  projectId: nullableId,
  clientId:  nullableId,
  amount,
  currency:  currencyEnum,
  date:      dateStr,
  method:    z.enum([...PAYMENT_METHODS] as [PaymentMethod, ...PaymentMethod[]]).default('bank'),
  category:  str(100).default(''),
  note:      str(1000).default(''),
})
export const TransactionUpdateSchema = TransactionSchema.partial()

/* ── Recurring payments ──────────────────────────────────────────────────── */

// `.refine()` yields a ZodEffects, which has no `.partial()` — so the plain
// object shape is kept separate and both exports are derived from it.
const recurringShape = z.object({
  title:     str(200).min(1, 'Title is required'),
  type:      z.enum([...TRANSACTION_TYPES] as [TransactionType, ...TransactionType[]]).default('income'),
  amount:    amount.refine((v) => v > 0, 'Amount must be more than zero'),
  currency:  currencyEnum,
  clientId:  nullableId,
  projectId: nullableId,
  method:    z.enum([...PAYMENT_METHODS] as [PaymentMethod, ...PaymentMethod[]]).default('bank'),
  category:  str(100).default(''),
  note:      str(1000).default(''),
  interval:  z.enum([...RECUR_INTERVALS] as [RecurInterval, ...RecurInterval[]]).default('monthly'),
  startDate: dateStr,
  endDate:   dateOrEmpty,
  active:    z.boolean().default(true),
})

// An end before the start would make a series that can never run — reject it
// here rather than letting it sit in the list looking like it works.
const endAfterStart = (v: { startDate?: string; endDate?: string }) =>
  !v.endDate || !v.startDate || v.endDate >= v.startDate
const endAfterStartMsg = {
  message: 'End date cannot be before the start date',
  path: ['endDate'],
}

export const RecurringSchema = recurringShape.refine(endAfterStart, endAfterStartMsg)
export const RecurringUpdateSchema = recurringShape.partial().refine(endAfterStart, endAfterStartMsg)

/** Posting occurrences: an explicit list of dates the caller saw on screen. */
export const RecurringPostSchema = z.object({
  dates: z.array(dateStr).min(1, 'Nothing to post').max(24),
})

/* ── Settings ────────────────────────────────────────────────────────────── */

export const FinanceSettingsSchema = z.object({
  baseCurrency: currencyEnum,
  // `partialRecord`, not `record`: in Zod v4 a record keyed by an enum is
  // EXHAUSTIVE, so a rates object missing any currency (which is always — the
  // base currency and any blank rate are omitted) failed validation and the
  // whole settings save was rejected with a 400.
  rates: z.partialRecord(currencyEnum, z.number().positive().max(1e9)).optional(),
  autoRates: z.boolean().optional().default(true),
})

/* ── Auth (finance gate) ─────────────────────────────────────────────────── */

export const FinanceUnlockSchema = z.object({
  password: z.string().min(1, 'Password required').max(200),
})

export const FinancePasswordSchema = z.object({
  // First-time set OR change. `current` is required only when one already exists;
  // `adminPassword` is required only on first-time set (enforced in the route).
  current: z.string().max(200).optional(),
  adminPassword: z.string().max(200).optional(),
  password: z.string().min(8, 'Use at least 8 characters').max(200),
})

export type ClientInputZ = z.infer<typeof ClientSchema>
export type ProjectInputZ = z.infer<typeof ProjectSchema>
export type TransactionInputZ = z.infer<typeof TransactionSchema>
