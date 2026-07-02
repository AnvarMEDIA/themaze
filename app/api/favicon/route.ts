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

/** Block private / loopback / link-local hosts to blunt SSRF via an
 *  admin-set favicon URL. String heuristic (no DNS resolution) — defense
 *  in depth alongside redirect:'error'. */
function isBlockedHost(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[|\]$/g, '')
  if (h === 'localhost' || h.endsWith('.localhost') || h === '0.0.0.0') return true
  if (h === '::1' || h.startsWith('fc') || h.startsWith('fd') || h.startsWith('fe80')) return true
  if (/^127\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h) || /^169\.254\./.test(h)) return true
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true
  return false
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
    'Content-Type':            contentType,
    'Cache-Control':           'public, max-age=0, must-revalidate',
    'X-Content-Type-Options':  'nosniff',
    // Make the proxied bytes inert when fetched directly — neutralises any
    // active content (e.g. a crafted SVG) that slipped past upload.
    'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
  }

  try {
    // External URL (e.g. Vercel Blob) → proxy the bytes. Guard against SSRF:
    // reject private hosts and disallow redirects.
    if (url.startsWith('http://') || url.startsWith('https://')) {
      let target: URL
      try {
        target = new URL(url)
      } catch {
        return NextResponse.json({ error: 'Invalid favicon URL' }, { status: 400 })
      }
      if (isBlockedHost(target.hostname)) {
        return NextResponse.json({ error: 'Blocked favicon host' }, { status: 400 })
      }
      const res = await fetch(target, { cache: 'no-store', redirect: 'error' })
      if (!res.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 })
      const buf = Buffer.from(await res.arrayBuffer())
      return new NextResponse(buf, { headers })
    }

    // Local path under /public — defend against ../ path traversal by
    // resolving the absolute path and verifying it stays inside /public.
    if (url.startsWith('/')) {
      const root = path.resolve(process.cwd(), 'public')
      const file = path.resolve(root, url.replace(/^\/+/, ''))
      if (!file.startsWith(root + path.sep) && file !== root) {
        return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
      }
      if (!fs.existsSync(file)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      const buf = fs.readFileSync(file)
      return new NextResponse(buf, { headers })
    }

    return NextResponse.json({ error: 'Invalid favicon URL' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Failed to read favicon' }, { status: 500 })
  }
}
