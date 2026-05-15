import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { getAnalytics } from '@/lib/analytics'

export const dynamic = 'force-dynamic'

export async function GET() {
  const authed = await getAdminSession()
  if (!authed) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const data = await getAnalytics()
  return NextResponse.json(data)
}
