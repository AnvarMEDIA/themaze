import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { FINANCE_COOKIE } from '@/lib/finance/auth'

export const dynamic = 'force-dynamic'

// Ends the finance session (leaves the admin session intact).
// Requires an admin session so this can't be driven cross-site: without the
// check, any page could force-clear a signed-in admin's finance cookie.
export async function POST() {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }
  const res = NextResponse.json({ ok: true })
  res.cookies.delete(FINANCE_COOKIE)
  return res
}
