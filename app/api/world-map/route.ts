import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getAdminSession } from '@/lib/auth'
import { WorldMapSchema } from '@/lib/validation'
import { getWorldMap, saveWorldMap } from '@/lib/worldMap'
import { countryByCode } from '@/lib/geo/mapData'

export const dynamic = 'force-dynamic'

/** The homepage map's countries and cities; the same thing the homepage shows. */
export async function GET() {
  try {
    return NextResponse.json(await getWorldMap())
  } catch (err) {
    console.error('[world-map GET]', err)
    return NextResponse.json({ error: 'Failed to load the map' }, { status: 500 })
  }
}

/** Replaces the whole list: the admin page edits a draft and saves it at once. */
export async function PUT(req: NextRequest) {
  const authed = await getAdminSession()
  if (!authed) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body   = await req.json().catch(() => null)
  const parsed = WorldMapSchema.safeParse(body)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return NextResponse.json(
      { error: first?.message ?? 'Invalid data', path: first?.path.join('.') ?? '' },
      { status: 400 },
    )
  }
  // A code the map has no geography for would light nothing.
  const unknown = parsed.data.countries.find((c) => !countryByCode(c.code))
  if (unknown) return NextResponse.json({ error: `Unknown country ${unknown.code}` }, { status: 400 })

  try {
    await saveWorldMap(parsed.data)
    revalidatePath('/', 'layout')
    return NextResponse.json(parsed.data)
  } catch (err) {
    console.error('[world-map PUT]', err)
    return NextResponse.json({ error: 'Failed to save the map' }, { status: 500 })
  }
}
