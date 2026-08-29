import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireFinance } from '@/lib/finance/guard'
import { listTransactions, updateTransaction } from '@/lib/finance/data'
import { knownPayees, suggestKind, unclassified } from '@/lib/finance/expenseKind'
import { EXPENSE_KINDS, type ExpenseKind } from '@/lib/finance/types'

export const dynamic = 'force-dynamic'

/**
 * Sorting the back catalogue into the new taxonomy.
 *
 * GET previews; POST applies. Deliberately two steps: these are money records,
 * and a keyword guess must never become a stored fact without someone seeing
 * it first. The POST also carries the exact kind per row, so what is written
 * is what was reviewed — not whatever the classifier would say a second time.
 */
export async function GET() {
  const blocked = await requireFinance()
  if (blocked) return blocked

  const txns = await listTransactions()
  const known = knownPayees(txns)
  const rows = unclassified(txns).map((t) => {
    const s = suggestKind(t, known)
    return {
      id: t.id,
      date: t.date,
      amount: t.amount,
      currency: t.currency,
      category: t.category,
      note: t.note,
      suggestedKind: s.kind,
      suggestedPayee: s.payee,
      reason: s.reason,
    }
  })

  return NextResponse.json({ total: rows.length, rows })
}

const ApplySchema = z.object({
  rows: z.array(z.object({
    id: z.string().min(1).max(64),
    expenseKind: z.enum([...EXPENSE_KINDS] as [ExpenseKind, ...ExpenseKind[]]),
    payee: z.string().trim().max(120).optional(),
  })).min(1, 'Nothing to apply').max(500),
})

export async function POST(req: NextRequest) {
  const blocked = await requireFinance()
  if (blocked) return blocked

  const parsed = ApplySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 })
  }

  const existing = new Map((await listTransactions()).map((t) => [t.id, t]))
  let applied = 0
  const skipped: string[] = []

  for (const row of parsed.data.rows) {
    const tx = existing.get(row.id)
    // Only ever fills a gap: a row that is not an expense, has vanished, or has
    // already been classified is left exactly as it is. Re-running the sweep
    // can therefore never overwrite a decision someone made by hand.
    if (!tx || tx.type !== 'expense' || tx.expenseKind) { skipped.push(row.id); continue }
    await updateTransaction(row.id, {
      expenseKind: row.expenseKind,
      ...(row.payee ? { payee: row.payee } : {}),
    })
    applied += 1
  }

  return NextResponse.json({ applied, skipped: skipped.length })
}
