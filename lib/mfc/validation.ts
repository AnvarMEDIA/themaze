import { z } from 'zod'
import { CURRENCIES, PAYMENT_METHODS, type Currency, type PaymentMethod } from '../finance/types'
import { MFC_CHIP_SLOTS } from './palette'

const str = (max: number) => z.string().trim().max(max, `Max ${max} characters`)
const currencyEnum = z.enum([...CURRENCIES] as [Currency, ...Currency[]])
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')

/**
 * One emoji, not a sentence. Counted in code points, so a flag or a family
 * (which are several code units) still counts as one character — and a pasted
 * paragraph is rejected rather than blowing out the grid.
 */
const icon = z
  .string()
  .trim()
  .refine((v) => v.length > 0 && [...v].length <= 4, 'Pick a single emoji')

const colorSlot = z
  .number()
  .int()
  .min(0)
  .max(MFC_CHIP_SLOTS.length - 1, 'Unknown colour')

/* ── Categories ──────────────────────────────────────────────────────────── */

export const MfcCategorySchema = z.object({
  name:         str(60).min(1, 'Name is required'),
  nameRu:       str(60).default(''),
  icon,
  colorSlot:    colorSlot.default(0),
  // Budgets are held in the base currency: a cap that moved with the dollar
  // would be a different cap every month.
  monthlyLimit: z.number().finite().min(0).max(1e15).default(0),
  archived:     z.boolean().default(false),
  order:        z.number().int().min(0).max(9999).optional(),
})
export const MfcCategoryUpdateSchema = MfcCategorySchema.partial()

export const MfcReorderSchema = z.object({
  ids: z.array(z.string().trim().min(1).max(64)).min(1).max(200),
})

/* ── Expenses ────────────────────────────────────────────────────────────── */

/**
 * No `type` field, by design: everything recorded here is money going out.
 *
 * The FX fields are absent too — a client must never be able to post its own
 * exchange rate. The rate is looked up server-side from the transaction's own
 * date and written there. Same rule as the company ledger.
 */
export const MfcExpenseSchema = z.object({
  categoryId: z
    .union([z.string().trim().max(64), z.null()])
    .optional()
    .transform((v) => (v ? v : null)),
  amount: z
    .number()
    .finite()
    .max(1e15, 'Amount too large')
    .refine((v) => v > 0, 'Amount must be more than zero'),
  currency: currencyEnum,
  date:     dateStr,
  note:     str(500).default(''),
  method:   z.enum([...PAYMENT_METHODS] as [PaymentMethod, ...PaymentMethod[]]).default('cash'),
})
export const MfcExpenseUpdateSchema = MfcExpenseSchema.partial()

export type MfcCategoryInputZ = z.infer<typeof MfcCategorySchema>
export type MfcExpenseInputZ = z.infer<typeof MfcExpenseSchema>
