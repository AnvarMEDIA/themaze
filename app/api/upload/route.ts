import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
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

    // Validate type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 })
    }

    // Validate size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
    }

    // Sanitize filename
    const ext      = path.extname(file.name).toLowerCase().replace(/[^.a-z0-9]/g, '')
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`
    const dir      = path.join(process.cwd(), 'public', 'portfolio', 'uploads')

    // Ensure directory exists
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    const buffer   = Buffer.from(await file.arrayBuffer())
    const filePath = path.join(dir, safeName)

    fs.writeFileSync(filePath, buffer)

    const url = `/portfolio/uploads/${safeName}`
    return NextResponse.json({ url })
  } catch (err) {
    console.error('Upload error:', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
