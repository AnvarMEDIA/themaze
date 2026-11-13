import { NextResponse } from 'next/server'
import { getIndexNowKey, keyFileName } from '@/lib/indexing'

/**
 * The IndexNow key file, https://www.maze.uz/<key>.txt. next.config.js
 * sends any such name at the site's root here; the key's own name gets
 * the key, any other is not found. At the root because a key file vouches
 * only for the addresses under its own folder (lib/indexing.ts).
 */
export const dynamic = 'force-dynamic'

export function GET(_req: Request, { params }: { params: { file: string } }) {
  if (params.file !== keyFileName()) {
    return new NextResponse('Not found', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
  }
  return new NextResponse(getIndexNowKey(), {
    headers: {
      'Content-Type':  'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
