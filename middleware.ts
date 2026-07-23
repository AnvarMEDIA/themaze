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
        await jwtVerify(token, getSecret(), {
          algorithms: ['HS256'],
          issuer:     'maze.uz/admin',
          audience:   'maze.uz/admin-ui',
        })
      } catch {
        const res = NextResponse.redirect(new URL('/admin/login', req.url))
        res.cookies.delete('maze_admin_token')
        return res
      }

      // ── Finance second gate ──────────────────────────────────────
      // The finance area requires a SEPARATE finance token on top of a
      // valid admin session. The unlock screen itself is exempt so the
      // user can get in. Distinct audience means an admin token can't
      // stand in for a finance token.
      if (
        pathname.startsWith('/admin/finance') &&
        !pathname.startsWith('/admin/finance/unlock')
      ) {
        const financeToken = req.cookies.get('maze_finance_token')?.value
        let financeOk = false
        if (financeToken) {
          try {
            await jwtVerify(financeToken, getSecret(), {
              algorithms: ['HS256'],
              issuer:     'maze.uz/admin',
              audience:   'maze.uz/finance',
            })
            financeOk = true
          } catch {
            financeOk = false
          }
        }
        if (!financeOk) {
          return NextResponse.redirect(new URL('/admin/finance/unlock', req.url))
        }
      }

      return addSecurityHeaders(NextResponse.next())
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
