import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { isFinancePasswordSet, getFinanceSession } from '@/lib/finance/auth'

export const dynamic = 'force-dynamic'

// Tells the unlock screen whether to show "set a password" (first run) or
// "enter password", and whether the finance session is already open.
// Admin-only so the finance state never leaks to anonymous callers.
export async function GET() {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }
  const [passwordSet, unlocked] = await Promise.all([
    isFinancePasswordSet(),
    getFinanceSession(),
  ])
  return NextResponse.json({ passwordSet, unlocked })
}
