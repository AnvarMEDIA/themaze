import { NextResponse } from 'next/server'
import { getAdminSession } from '../auth'
import { getFinanceSession, FINANCE_COOKIE, FINANCE_COOKIE_MAX_AGE, signFinanceToken } from './auth'

/**
 * Guard for finance data endpoints: requires BOTH a valid admin session and a
 * valid finance session. Returns a 401 response to short-circuit, or null when
 * the caller may proceed.
 *
 *   const blocked = await requireFinance()
 *   if (blocked) return blocked
 */
export async function requireFinance(): Promise<NextResponse | null> {
  const [admin, finance] = await Promise.all([getAdminSession(), getFinanceSession()])
  if (!admin || !finance) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }
  return null
}

/** Attach a freshly-minted finance session cookie to a response. */
export async function attachFinanceCookie(res: NextResponse): Promise<NextResponse> {
  const token = await signFinanceToken()
  res.cookies.set(FINANCE_COOKIE, token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge:   FINANCE_COOKIE_MAX_AGE,
    path:     '/',
  })
  return res
}
