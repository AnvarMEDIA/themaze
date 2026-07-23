import { NextResponse } from 'next/server'
import { FINANCE_COOKIE } from '@/lib/finance/auth'

export const dynamic = 'force-dynamic'

// Ends the finance session (leaves the admin session intact).
export async function POST() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete(FINANCE_COOKIE)
  return res
}
