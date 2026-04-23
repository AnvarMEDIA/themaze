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

    if (!file.type.startsWith('image/') && !isIco) {
      return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 })
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
    }

    const ext      = path.extname(file.name).toLowerCase().replace(/[^.a-z0-9]/g, '')
    const baseName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`

    const ALLOWED_FOLDERS = ['portfolio', 'team', 'partners', 'favicon'] as const
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
