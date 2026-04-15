import { NextResponse } from 'next/server'
import { getSettings, saveSettings } from '@/lib/settings'
import type { SiteSettings } from '@/lib/settings'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    return NextResponse.json(getSettings())
  } catch {
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json() as SiteSettings
    saveSettings(body)
    return NextResponse.json(body)
  } catch {
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
  }
}
