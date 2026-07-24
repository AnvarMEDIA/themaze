import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession, checkPassword } from '@/lib/auth'
import { clientIp, rateLimitAsync } from '@/lib/rateLimit'
import {
  isFinancePasswordSet,
  verifyFinancePassword,
  setFinancePassword,
} from '@/lib/finance/auth'
import { attachFinanceCookie } from '@/lib/finance/guard'
import { FinancePasswordSchema } from '@/lib/finance/validation'

export const dynamic = 'force-dynamic'

// Sets the finance password (first run) or changes it. Requires an admin
// session; changing an existing password also requires the current one.
// On success the caller is unlocked immediately (finance cookie attached).
export async function POST(req: NextRequest) {
  const ip = clientIp(req)
  const rl = await rateLimitAsync(`finance-pw:${ip}`, { limit: 10, windowMs: 15 * 60 * 1000 })
  if (!rl.success) {
    return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 })
  }

  if (!(await getAdminSession())) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const parsed = FinancePasswordSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid data', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const { current, adminPassword, password } = parsed.data
  const alreadySet = await isFinancePasswordSet()

  if (alreadySet) {
    if (!current || !(await verifyFinancePassword(current))) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 })
    }
  } else {
    // First-time provisioning. Require the ADMIN password on top of the admin
    // session so that (a) a stolen session cookie alone cannot claim the
    // finance factor, and (b) a transient store read error — which makes
    // isFinancePasswordSet() report false — cannot silently re-open this path
    // and let someone overwrite an existing finance password.
    if (!adminPassword || !checkPassword(adminPassword)) {
      return NextResponse.json({ error: 'admin_password_required' }, { status: 401 })
    }
  }

  await setFinancePassword(password)
  return attachFinanceCookie(NextResponse.json({ ok: true, firstTime: !alreadySet }))
}
