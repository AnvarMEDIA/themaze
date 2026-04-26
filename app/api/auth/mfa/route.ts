import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'
import { getAdminSession } from '@/lib/auth'
import {
  buildOtpAuthUrl,
  disableMfa,
  enableMfa,
  generateSecret,
  isMfaEnabled,
  verifyTotp,
} from '@/lib/mfa'
import { MfaVerifySchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'

/** GET — current MFA status (admin only). */
export async function GET() {
  const authed = await getAdminSession()
  if (!authed) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  return NextResponse.json({ enabled: await isMfaEnabled() })
}

/** POST — generate a fresh secret + QR code (does NOT persist yet). */
export async function POST() {
  const authed = await getAdminSession()
  if (!authed) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const secret    = generateSecret()
  const otpauth   = buildOtpAuthUrl(secret)
  const qrDataUrl = await QRCode.toDataURL(otpauth, { margin: 1, width: 240 })
  return NextResponse.json({ secret, otpauth, qr: qrDataUrl })
}

/** PUT — verify the user-entered code against the secret and persist. */
export async function PUT(req: NextRequest) {
  const authed = await getAdminSession()
  if (!authed) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const parsed = MfaVerifySchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 })
  }

  const { secret, code } = parsed.data
  if (!(await verifyTotp(code, secret))) {
    return NextResponse.json({ error: 'Invalid code' }, { status: 400 })
  }
  await enableMfa(secret)
  return NextResponse.json({ ok: true, enabled: true })
}

/** DELETE — disable MFA. */
export async function DELETE() {
  const authed = await getAdminSession()
  if (!authed) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  await disableMfa()
  return NextResponse.json({ ok: true, enabled: false })
}
