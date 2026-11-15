import { NextResponse } from 'next/server'
import { isServiceSlug } from '@/lib/services'
import { readLocalCoverFile } from '@/lib/serviceCoverFiles'

export const dynamic = 'force-dynamic'

/**
 * Cover files kept on this machine (lib/serviceCoverFiles), for local
 * development and the tests, where there is no Blob. In production the
 * files are in Blob and this answers 404.
 */
export async function GET(_req: Request, { params }: { params: { slug: string; name: string } }) {
  if (!isServiceSlug(params.slug)) return new NextResponse('Not found', { status: 404 })
  const body = await readLocalCoverFile(params.slug, params.name)
  if (!body) return new NextResponse('Not found', { status: 404 })
  return new NextResponse(new Uint8Array(body), {
    headers: {
      'Content-Type': params.name.endsWith('.jpg') ? 'image/jpeg' : 'image/webp',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
