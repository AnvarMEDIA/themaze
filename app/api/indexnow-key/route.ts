import { NextResponse } from 'next/server'
import { getIndexNowKey } from '@/lib/indexing'

/**
 * IndexNow key file. The verifier (Bing / Yandex / Seznam / Naver)
 * fetches this URL and checks the body equals the key sent in the
 * POST. We expose it from /api so the public folder stays clean.
 */
export const dynamic = 'force-static'

export async function GET() {
  return new NextResponse(getIndexNowKey(), {
    headers: {
      'Content-Type':  'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
