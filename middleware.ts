import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'
import { type NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const intlMiddleware = createMiddleware(routing)

function getSecret(): Uint8Array {
  const s = process.env.JWT_SECRET
  if (!s) throw new Error('[middleware] JWT_SECRET environment variable is required')
  return new TextEncoder().encode(s)
}

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options':    'nosniff',
  'X-Frame-Options':            'DENY',
  'X-XSS-Protection':          '1; mode=block',
  'Referrer-Policy':            'strict-origin-when-cross-origin',
  'Permissions-Policy':         'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security':  'max-age=63072000; includeSubDomains; preload',
}

function addSecurityHeaders(res: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    res.headers.set(key, value)
  }
  return res
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // ── API routes — bypass intl, but add security headers ────────
  if (pathname.startsWith('/api/')) {
    const res = NextResponse.next()
    return addSecurityHeaders(res)
  }

  // ── Admin JWT protection ────────────────────────────────────────
  if (pathname.startsWith('/admin')) {
    if (!pathname.startsWith('/admin/login')) {
      const token = req.cookies.get('maze_admin_token')?.value

      if (!token) {
        return NextResponse.redirect(new URL('/admin/login', req.url))
      }

      try {
        await jwtVerify(token, getSecret())
        return addSecurityHeaders(NextResponse.next())
      } catch {
        const res = NextResponse.redirect(new URL('/admin/login', req.url))
        res.cookies.delete('maze_admin_token')
        return res
      }
    }
    return addSecurityHeaders(NextResponse.next())
  }

  // ── i18n locale routing for all public routes ───────────────────
  const res = await intlMiddleware(req) as NextResponse
  return addSecurityHeaders(res)
}

export const config = {
  /**
   * Match all routes except:
   *  - Next.js internals (_next/*)
   *  - Static files (any path with a file extension)
   */
  matcher: ['/((?!_next|_vercel|.*\\..*).*)'],
}
