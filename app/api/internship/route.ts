import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getAdminSession } from '@/lib/auth'
import { InternApplicationSchema, InternshipSettingsSchema } from '@/lib/validation'
import { rateLimitAsync, clientIp } from '@/lib/rateLimit'
import { notifyNewInternApplication } from '@/lib/notify'
import { notifyIndexNow, localePair } from '@/lib/indexing'
import { SITE_URL } from '@/lib/seo'
import {
  addApplication, getApplications, getInternshipSettings, setApplicationNotified, setInternshipOpen,
} from '@/lib/internshipStore'

export const dynamic = 'force-dynamic'

/** The switch and every application. Admin only: applications are personal data. */
export async function GET() {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }
  const [settings, applications] = await Promise.all([getInternshipSettings(), getApplications()])
  return NextResponse.json({ settings, applications })
}

/** A candidate applies from the public page. */
export async function POST(req: NextRequest) {
  // As tight as the brief: one person applies once, a script tries many times.
  const ip = clientIp(req)
  const rl = await rateLimitAsync(`internship:${ip}`, { limit: 3, windowMs: 10 * 60 * 1000 })
  if (!rl.success) {
    const retryAfterSec = Math.ceil((rl.resetAt - Date.now()) / 1000)
    return NextResponse.json(
      { error: 'Too many submissions. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After':           String(retryAfterSec),
          'X-RateLimit-Limit':     '3',
          'X-RateLimit-Remaining': '0',
        },
      },
    )
  }

  try {
    // A page opened before the intake closed still has its form; the closing
    // is enforced here, not by the page.
    const settings = await getInternshipSettings()
    if (!settings.open) {
      return NextResponse.json({ error: 'closed' }, { status: 409 })
    }

    const parsed = InternApplicationSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 })
    }

    // Honeypot: accept silently so a bot doesn't learn it was caught.
    if (parsed.data.hp && parsed.data.hp.trim().length > 0) {
      console.warn(`[internship] Honeypot triggered from IP ${ip}`)
      return NextResponse.json({ ok: true }, { status: 201 })
    }

    const { hp: _hp, ...data } = parsed.data
    const application = await addApplication(data)

    // Saved first, so a Telegram outage can never cost an application; the
    // failure is recorded and shown in the admin instead.
    const notified = await notifyNewInternApplication(application, SITE_URL)
    if (!notified.ok) {
      console.error(`[internship] saved ${application.id} but the alert failed: ${notified.error ?? 'unknown'}`)
    }
    await setApplicationNotified(application.id, notified).catch(() => {})

    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (err) {
    console.error('[internship] Server error', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

/** Open or close the intake. */
export async function PUT(req: NextRequest) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }
  const parsed = InternshipSettingsSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
  }

  try {
    const before = await getInternshipSettings()
    const settings = await setInternshipOpen(parsed.data.open)
    // The menu, the footer, the sitemap and the page itself all follow it.
    revalidatePath('/', 'layout')
    // Opening asks search engines to read the page; closing asks them to see
    // it is no longer indexable.
    if (before.open !== settings.open) void notifyIndexNow(localePair('internship'))
    return NextResponse.json(settings)
  } catch (err) {
    console.error('[internship PUT]', err)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }
}
