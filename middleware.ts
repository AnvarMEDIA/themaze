import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'
import { type NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { NOT_FOUND_HEADER, NOWHERE, STORE_KINDS, claimOn, type StoreKind, type StoreQuestion } from './lib/publicRoutes'

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

/**
 * Next builds social-card URLs from the route's own segments, so with a
 * `[locale]` segment they always carry the prefix — including `/en/`, which
 * `localePrefix: 'as-needed'` otherwise redirects away. That made every
 * English og:image a 307 for the crawler that fetched it, and a crawler that
 * doesn't follow redirects on images (some still don't) showed no preview.
 * These are generated assets, not pages: they read the locale straight off
 * the segment and need no negotiation, so serve them where they're asked for.
 */
const METADATA_IMAGE = /\/(opengraph-image|twitter-image|icon|apple-icon)(-[a-z0-9]+)?\/?$/i

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // ── API routes — bypass intl, but add security headers ────────
  if (pathname.startsWith('/api/')) {
    const res = NextResponse.next()
    return addSecurityHeaders(res)
  }

  // ── Generated metadata images — bypass locale negotiation ─────
  if (METADATA_IMAGE.test(pathname)) {
    return addSecurityHeaders(NextResponse.next())
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

  // A redirect (a locale prefix to add or to drop) goes out as it is; the
  // address it points to comes back through here.
  if (res.status >= 300 && res.status < 400) return addSecurityHeaders(res)

  // ── An address no page claims ───────────────────────────────────
  // With `localePrefix: 'as-needed'` what is left is either a path that
  // starts with a locale or one in the default locale.
  const [first = '', ...rest] = pathSegments(pathname)
  const prefixed = (routing.locales as readonly string[]).includes(first)
  const locale   = prefixed ? first : routing.defaultLocale
  const segments = prefixed ? rest : [first, ...rest].filter(Boolean)

  const claim   = claimOn(segments, req.cookies.has('maze_admin_token'))
  const claimed = typeof claim === 'boolean' ? claim : await storeHas(req, claim)

  return addSecurityHeaders(claimed ? res : notFound(req, res, locale))
}

/** /ru/portfolio/caf%C3%A9 → ['ru', 'portfolio', 'café'] */
function pathSegments(pathname: string): string[] {
  return pathname.split('/').filter(Boolean).map((s) => {
    try {
      return decodeURIComponent(s)
    } catch {
      return s
    }
  })
}

/* ── What the store has ────────────────────────────────────────────────
 * A project, a client, a tag: the page for it exists if the store has one
 * by that slug, and the store cannot be read from here. /api/public-slugs
 * can, so the middleware asks it and remembers the answer for as long as
 * this instance lives.
 *
 * What it remembers only ever lets a request through. A slug on the list is
 * taken as there for a minute; after that, or for a slug that is not on it,
 * the list is fetched again before anything is answered 404. So a project
 * published a moment ago is found, and the usual visit, to a page that
 * exists, costs nothing. The few seconds a miss is trusted for keep a run
 * of made-up addresses from fetching the list once each.
 *
 * If the list cannot be had (the request fails, or takes too long) the
 * address goes on to its page, which decides as it always did.
 */
type Slugs = Record<StoreKind, Set<string>>

const TRUST_A_HIT_FOR  = 60_000
const TRUST_A_MISS_FOR = 5_000
const WAIT_FOR_STORE   = 3_000

// The list, and the site it was fetched from: one site's list never answers
// for another's.
let known: { origin: string; slugs: Slugs; at: number } | null = null

async function storeHas(req: NextRequest, { kind, slug }: StoreQuestion): Promise<boolean> {
  const { origin } = req.nextUrl

  if (known && known.origin === origin) {
    const age = Date.now() - known.at
    const has = known.slugs[kind].has(slug)
    if (has && age < TRUST_A_HIT_FOR) return true
    if (!has && age < TRUST_A_MISS_FOR) return false
  }

  const slugs = await fetchSlugs(origin, req.headers.get('cookie'))
  if (!slugs) return true
  known = { origin, slugs, at: Date.now() }
  return slugs[kind].has(slug)
}

async function fetchSlugs(origin: string, cookie: string | null): Promise<Slugs | null> {
  const giveUp = new AbortController()
  const timer  = setTimeout(() => giveUp.abort(), WAIT_FOR_STORE)
  try {
    const res = await fetch(new URL('/api/public-slugs', origin), {
      // A preview deployment behind Vercel's login lets the visitor's own
      // cookie through, and nothing without one.
      headers: cookie ? { cookie } : undefined,
      signal:  giveUp.signal,
    })
    if (!res.ok) return null
    const lists = await res.json() as Partial<Record<StoreKind, unknown>>

    const slugs = {} as Slugs
    for (const kind of STORE_KINDS) {
      // Anything but the expected lists is no answer at all: an empty set
      // here would turn every page of that kind into a 404.
      const list = lists[kind]
      if (!Array.isArray(list)) return null
      slugs[kind] = new Set(list as string[])
    }
    return slugs
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/**
 * The answer to an address no page claims. The request goes on to a path
 * where no page lives, so Next answers with app/not-found.tsx and a 404,
 * rendered on the server, and the mark it carries tells that file to draw
 * the public 404 screen in the visitor's language. A page that throws
 * `notFound()` cannot do this: its answer is an empty document that a
 * script fills in (see lib/publicRoutes.ts).
 */
function notFound(req: NextRequest, intl: NextResponse, locale: string): NextResponse {
  const url = req.nextUrl.clone()
  url.pathname = `/${locale}/${NOWHERE}`
  url.search   = ''

  const headers = new Headers(req.headers)
  headers.set(NOT_FOUND_HEADER, locale)
  // The header next-intl's own middleware puts on a request. The root
  // layout reads it (getLocale) for <html lang>.
  headers.set('X-NEXT-INTL-LOCALE', locale)

  const res = NextResponse.rewrite(url, { request: { headers } })
  // The locale middleware's cookie still goes out.
  for (const cookie of intl.cookies.getAll()) res.cookies.set(cookie)
  return res
}

export const config = {
  /**
   * Match all routes except:
   *  - Next.js internals (_next/*)
   *  - Static files (any path with a file extension)
   */
  matcher: ['/((?!_next|_vercel|.*\\..*).*)'],
}
