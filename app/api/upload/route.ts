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

    const isIco = /\.ico$/i.test(file.name) ||
      file.type === 'image/x-icon' ||
      file.type === 'image/vnd.microsoft.icon'

    // SVG files can contain embedded JavaScript — block regardless of allowed image types.
    if (file.type === 'image/svg+xml' || /\.svg$/i.test(file.name)) {
      return NextResponse.json({ error: 'SVG files are not allowed for security reasons' }, { status: 400 })
    }

    if (!file.type.startsWith('image/') && !isIco) {
      return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 })
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
    }

    const ext      = path.extname(file.name).toLowerCase().replace(/[^.a-z0-9]/g, '')
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
    const root     = path.resolve(process.cwd(), 'public')
    const dir      = path.resolve(root, folder, 'uploads')
    const filePath = path.resolve(dir, baseName)
    // Defend against path traversal
    if (!filePath.startsWith(root + path.sep)) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 })
    }
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    const buffer = Buffer.from(await file.arrayBuffer())
    fs.writeFileSync(filePath, buffer)
    return NextResponse.json({ url: `/${folder}/uploads/${baseName}` })

  } catch (err) {
    console.error('Upload error:', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
