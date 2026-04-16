import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'
import { type NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const intlMiddleware = createMiddleware(routing)

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'maze-default-secret-change-in-production'
)

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // ── API routes — bypass everything ────────────────────────────
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // ── Admin JWT protection ────────────────────────────────────────
  if (pathname.startsWith('/admin')) {
    if (!pathname.startsWith('/admin/login')) {
      const token = req.cookies.get('maze_admin_token')?.value

      if (!token) {
        return NextResponse.redirect(new URL('/admin/login', req.url))
      }

      try {
        await jwtVerify(token, secret)
        return NextResponse.next()
      } catch {
        const res = NextResponse.redirect(new URL('/admin/login', req.url))
        res.cookies.delete('maze_admin_token')
        return res
      }
    }
    return NextResponse.next()
  }

  // ── i18n locale routing for all public routes ───────────────────
  return intlMiddleware(req)
}

export const config = {
  /**
   * Match all routes except:
   *  - Next.js internals (_next/*)
   *  - Static files (any path with a file extension)
   */
  matcher: ['/((?!_next|_vercel|.*\\..*).*)'],
}
