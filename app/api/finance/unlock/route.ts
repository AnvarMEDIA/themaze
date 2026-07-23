import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { clientIp, rateLimitAsync } from '@/lib/rateLimit'
import { isFinancePasswordSet, verifyFinancePassword } from '@/lib/finance/auth'
import { attachFinanceCookie } from '@/lib/finance/guard'
import { FinanceUnlockSchema } from '@/lib/finance/validation'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  // Anti-brute-force: 8 attempts / 15 min / IP.
  const ip = clientIp(req)
  const rl = await rateLimitAsync(`finance-unlock:${ip}`, { limit: 8, windowMs: 15 * 60 * 1000 })
  if (!rl.success) {
    const retryAfter = Math.ceil((rl.resetAt - Date.now()) / 1000)
    return NextResponse.json(
      { error: 'Too many attempts. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    )
  }

  // Must already be an authenticated admin to even attempt finance unlock.
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  if (!(await isFinancePasswordSet())) {
    return NextResponse.json({ error: 'not_set' }, { status: 409 })
  }

  const parsed = FinanceUnlockSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  if (!(await verifyFinancePassword(parsed.data.password))) {
    console.warn(`[finance] Failed unlock from IP ${ip}`)
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
  }

  return attachFinanceCookie(NextResponse.json({ ok: true }))
}
