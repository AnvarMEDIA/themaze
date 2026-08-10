import { NextRequest, NextResponse } from 'next/server'
import { requireFinance } from '@/lib/finance/guard'
import { getRecurring, createTransactions, setRecurringNextDate } from '@/lib/finance/data'
import { RecurringPostSchema } from '@/lib/finance/validation'
import { dueDates, advanceAfter } from '@/lib/finance/recurring'

export const dynamic = 'force-dynamic'

interface Ctx { params: { id: string } }

/**
 * Turn due occurrences of a recurring payment into real ledger entries.
 *
 * The caller sends the exact dates it showed on screen, and every one is
 * re-checked against what is actually due right now. That makes the call
 * idempotent by construction: the first request advances `nextDate`, so a
 * duplicate (double-click, retried fetch) finds none of its dates due and
 * posts nothing rather than booking the money twice.
 */
export async function POST(req: NextRequest, { params }: Ctx) {
  const blocked = await requireFinance()
  if (blocked) return blocked

  const parsed = RecurringPostSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 })
  }

  const rec = await getRecurring(params.id)
  if (!rec) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Only ever post a CONTIGUOUS run from the oldest due date. `nextDate` is a
  // single watermark, so honouring a request for, say, the 1st and the 3rd but
  // not the 2nd would advance the watermark past the 2nd and lose it silently.
  const wanted = new Set(parsed.data.dates)
  const dates: string[] = []
  for (const d of dueDates(rec).dates) {
    if (!wanted.has(d)) break
    dates.push(d)
  }

  if (dates.length === 0) {
    // Already posted, or never due. Not an error the user needs to act on —
    // but it must not read as a successful posting either.
    return NextResponse.json({ error: 'already_posted', posted: 0 }, { status: 409 })
  }

  const created = await createTransactions(
    dates.map((date) => ({
      type: rec.type,
      // Stamped with its schedule so the forecast can tell a committed cost
      // from an ad-hoc one, and the duplicate check doesn't flag a retainer
      // for repeating — which is what a retainer is for.
      recurringId: rec.id,
      projectId: rec.projectId,
      clientId: rec.clientId,
      amount: rec.amount,
      currency: rec.currency,
      date,
      method: rec.method,
      category: rec.category || rec.title,
      note: rec.note,
    })),
  )

  await setRecurringNextDate(params.id, advanceAfter(rec, dates[dates.length - 1]))

  return NextResponse.json({ posted: created.length, transactions: created }, { status: 201 })
}
