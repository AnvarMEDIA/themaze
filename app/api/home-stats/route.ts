import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getAdminSession } from '@/lib/auth'
import { HomeStatsSchema } from '@/lib/validation'
import { getHomeStats, saveHomeStats } from '@/lib/homeStatsStore'

export const dynamic = 'force-dynamic'

/** The homepage's four numbers; the same ones the homepage shows. */
export async function GET() {
  try {
    return NextResponse.json(await getHomeStats())
  } catch (err) {
    console.error('[home-stats GET]', err)
    return NextResponse.json({ error: 'Failed to load the numbers' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const authed = await getAdminSession()
  if (!authed) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const parsed = HomeStatsSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return NextResponse.json(
      { error: first?.message ?? 'Invalid data', path: first?.path.join('.') ?? '' },
      { status: 400 },
    )
  }

  try {
    await saveHomeStats(parsed.data)
    revalidatePath('/', 'layout')
    return NextResponse.json(parsed.data)
  } catch (err) {
    console.error('[home-stats PUT]', err)
    return NextResponse.json({ error: 'Failed to save the numbers' }, { status: 500 })
  }
}
