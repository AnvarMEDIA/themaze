import { NextRequest, NextResponse } from 'next/server'
import { signToken, checkPassword, COOKIE_NAME } from '@/lib/auth'
import { rateLimitAsync } from '@/lib/rateLimit'
import { LoginSchema } from '@/lib/validation'

export async function POST(req: NextRequest) {
  // Rate limit: 5 attempts per 15 minutes per IP
  const ip  = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  const rl  = await rateLimitAsync(`login:${ip}`, { limit: 5, windowMs: 15 * 60 * 1000 })

  if (!rl.success) {
    const retryAfterSec = Math.ceil((rl.resetAt - Date.now()) / 1000)
    console.warn(`[auth] Rate limit hit for IP ${ip}`)
    return NextResponse.json(
      { error: 'Too many login attempts. Try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After':       String(retryAfterSec),
          'X-RateLimit-Limit': '5',
          'X-RateLimit-Remaining': '0',
        },
      }
    )
  }

  try {
    const parsed = LoginSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const { password } = parsed.data

    if (!checkPassword(password)) {
      console.warn(`[auth] Failed login attempt from IP ${ip}`)
      // Always return the same error regardless of which check fails (no info leakage)
      return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
    }

    console.info(`[auth] Successful login from IP ${ip}`)
    const token = await signToken({ role: 'admin' })

    const response = NextResponse.json({ ok: true })
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge:   60 * 60 * 24 * 7, // 7 days
      path:     '/',
    })

    return response
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[auth] Login error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
