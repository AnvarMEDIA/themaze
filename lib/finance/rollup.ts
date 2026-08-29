/**
 * Per-project money rollup — shared by the server dashboard and the client
 * Projects page so the two can never disagree about what a project is owed.
 *
 * Pure and client-safe. Amounts are returned in the PROJECT's own currency;
 * payments made in another currency are converted through the base currency.
 * A payment whose currency has no usable rate is not silently counted as
 * zero: it is reported in `unconverted` so the UI can say so out loud.
 */
import { rateOf, txBase } from './money'
import type {
  Currency,
  FinanceProject,
  FinanceSettings,
  FinanceTransaction,
} from './types'

export interface ProjectRollup {
  /** Total received, in the project's currency. */
  received: number
  /**
   * Arithmetic remainder: agreed amount − received, in the project's currency,
   * never negative. Says nothing about whether anyone will pay it.
   */
  outstanding: number
  /**
   * What is actually collectable — `outstanding`, but zero once a project is
   * cancelled or still only a lead. Nobody is going to pay for a job that was
   * called off, and a lead has not agreed to anything yet.
   *
   * This is the figure every total should use. `outstanding` exists for the
   * one place that genuinely wants the raw arithmetic.
   */
  owed: number
  /** The prepayment, if one is identifiable. */
  prepayment: { amount: number; currency: Currency; date: string } | null
  /** Currencies of linked payments that could not be converted (no rate). */
  unconverted: Currency[]
}

/** Legacy rows predate the explicit `kind` marker — fall back to the label. */
const PREPAYMENT_LABEL = /^(prepayment|предоплата|oldindan to['’]?lov)$/i

function isPrepayment(t: FinanceTransaction): boolean {
  return t.kind === 'prepayment' || PREPAYMENT_LABEL.test((t.category ?? '').trim())
}

/** Income transactions linked to this project, oldest first. */
export function projectPayments(
  project: FinanceProject,
  txns: FinanceTransaction[],
): FinanceTransaction[] {
  return txns
    .filter((t) => t.type === 'income' && t.projectId === project.id)
    .sort((a, b) => {
      const d = (a.date || '').localeCompare(b.date || '')
      // Same-day payments: fall back to creation order for a stable result.
      return d !== 0 ? d : (a.createdAt || '').localeCompare(b.createdAt || '')
    })
}

export function projectRollup(
  project: FinanceProject,
  txns: FinanceTransaction[],
  settings: FinanceSettings,
): ProjectRollup {
  const payments = projectPayments(project, txns)

  let received = 0
  const unconverted: Currency[] = []
  for (const t of payments) {
    // Same currency as the project: exact, no rate involved at all.
    // Otherwise the payment's LOCKED base value, then into the project's
    // currency at today's rate — the claim itself is priced today.
    if (t.currency === project.currency) { received += t.amount; continue }
    const inBase = txBase(t, settings).value
    const projRate = rateOf(project.currency, settings)
    if (inBase === null || projRate === null) unconverted.push(t.currency)
    else received += inBase / projRate
  }

  // Explicitly marked prepayment wins; otherwise the first payment received,
  // but only when it is actually labelled as one — a lone final payment must
  // not be presented as a prepayment.
  const marked = payments.find((t) => t.kind === 'prepayment')
  const pre = marked ?? payments.find(isPrepayment) ?? null

  const outstanding = Math.max(0, project.amount - received)
  const collectable = project.status === 'active' || project.status === 'completed'

  return {
    received,
    outstanding,
    owed: collectable ? outstanding : 0,
    prepayment: pre ? { amount: pre.amount, currency: pre.currency, date: pre.date } : null,
    unconverted: Array.from(new Set(unconverted)),
  }
}
