import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { put } from '@vercel/blob'
import path from 'path'
import fs   from 'fs'

export async function POST(req: NextRequest) {
  const authed = await getAdminSession()
  if (!authed) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const formData = await req.formData()
    const file     = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Reject SVG (active content → stored XSS) and anything outside a
    // raster/icon allowlist. MIME is client-controlled, so we also pin the
    // stored extension to the allowlist instead of trusting the filename.
    const ALLOWED_EXT  = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif', '.ico'])
    const ALLOWED_MIME = new Set([
      'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif',
      'image/x-icon', 'image/vnd.microsoft.icon',
    ])
    const rawExt = path.extname(file.name).toLowerCase().replace(/[^.a-z0-9]/g, '')

    if (file.type === 'image/svg+xml' || rawExt === '.svg') {
      return NextResponse.json({ error: 'SVG uploads are not allowed' }, { status: 400 })
    }
    if (!ALLOWED_MIME.has(file.type) && !ALLOWED_EXT.has(rawExt)) {
      return NextResponse.json(
        { error: 'Only PNG, JPG, WEBP, GIF, AVIF or ICO images are allowed' },
        { status: 400 },
      )
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
    }

    const ext      = ALLOWED_EXT.has(rawExt) ? rawExt : '.png'
    const baseName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`

    const ALLOWED_FOLDERS = ['portfolio', 'team', 'partners', 'favicon', 'testimonials', 'insights'] as const
    type AllowedFolder = typeof ALLOWED_FOLDERS[number]
    const rawFolder = (formData.get('folder') as string | null) ?? 'portfolio'
    const folder: AllowedFolder = (ALLOWED_FOLDERS as readonly string[]).includes(rawFolder)
      ? rawFolder as AllowedFolder
      : 'portfolio'

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(`${folder}/${baseName}`, file, { access: 'public' })
      return NextResponse.json({ url: blob.url })
    }

    // Dev fallback — local filesystem
    const dir = path.join(process.cwd(), 'public', folder, 'uploads')
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    const buffer = Buffer.from(await file.arrayBuffer())
    fs.writeFileSync(path.join(dir, baseName), buffer)
    return NextResponse.json({ url: `/${folder}/uploads/${baseName}` })

  } catch (err) {
    console.error('Upload error:', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
