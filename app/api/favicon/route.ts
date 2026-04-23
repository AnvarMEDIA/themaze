import { NextResponse } from 'next/server'
import { getSettings } from '@/lib/settings'
import { unstable_noStore as noStore } from 'next/cache'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

const MIME_BY_EXT: Record<string, string> = {
  '.ico':  'image/x-icon',
  '.png':  'image/png',
  '.svg':  'image/svg+xml',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif':  'image/gif',
  '.avif': 'image/avif',
}

export async function GET() {
  noStore()

  const settings = await getSettings().catch(() => null)
  const url = settings?.favicon?.trim()

  if (!url) {
    return NextResponse.json({ error: 'No favicon set' }, { status: 404 })
  }

  const ext = path.extname(url.split('?')[0]).toLowerCase()
  const contentType = MIME_BY_EXT[ext] ?? 'image/x-icon'
  const headers = {
    'Content-Type':  contentType,
    'Cache-Control': 'public, max-age=0, must-revalidate',
  }

  try {
    // External URL (e.g. Vercel Blob) → proxy the bytes
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 })
      const buf = Buffer.from(await res.arrayBuffer())
      return new NextResponse(buf, { headers })
    }

    // Local path under /public
    if (url.startsWith('/')) {
      const file = path.join(process.cwd(), 'public', url.replace(/^\/+/, ''))
      if (!fs.existsSync(file)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      const buf = fs.readFileSync(file)
      return new NextResponse(buf, { headers })
    }

    return NextResponse.json({ error: 'Invalid favicon URL' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Failed to read favicon' }, { status: 500 })
  }
}
