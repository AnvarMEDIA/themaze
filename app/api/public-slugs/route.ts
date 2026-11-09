import { NextResponse } from 'next/server'
import { getPublicSlugs } from '@/lib/publicSlugs'

// The store is read live: a project published a moment ago is on the list.
export const dynamic = 'force-dynamic'

/**
 * The slugs of everything published, for the middleware, which asks before
 * it lets a project, client, tag or post page through (lib/publicSlugs.ts).
 * Nothing here is private: the same pages are in the sitemap.
 */
export async function GET() {
  try {
    return NextResponse.json(await getPublicSlugs(), {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (err) {
    console.error('[public-slugs GET]', err)
    return NextResponse.json({ error: 'Failed to read the store' }, { status: 500 })
  }
}
