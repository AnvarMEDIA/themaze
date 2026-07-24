import { z } from 'zod'
import {
  CURRENCIES,
  CLIENT_STATUSES,
  PROJECT_STATUSES,
  TRANSACTION_TYPES,
  PAYMENT_METHODS,
  type Currency,
  type ClientStatus,
  type ProjectStatus,
  type TransactionType,
  type PaymentMethod,
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
