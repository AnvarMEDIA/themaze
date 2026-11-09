import { INSIGHTS_ENABLED } from './features'
import { LEGAL_SLUGS } from './legal'
import { SERVICE_SLUGS } from './services'
import { VALID_CATEGORIES } from './utils'

/**
 * The public pages, as the middleware needs to know them.
 *
 * Next 14 answers `notFound()` with an empty document: the error leaves the
 * server render, the status becomes 404, and the body is a shell that a
 * script fills in afterwards. With scripts off that is a blank page. (Next
 * 16 does the same.) The one 404 Next does render on the server is its own:
 * app/not-found.tsx, for a request that matches no route at all.
 *
 * So middleware.ts turns an address nobody claims into exactly that. It
 * sends the request on to a path where no page lives, marked with the
 * visitor's locale, and app/not-found.tsx, seeing the mark, draws the
 * localized 404 inside the header and the footer. For this the middleware
 * has to know, before anything is rendered, which addresses a page does
 * claim. That is this list.
 *
 * It mirrors the folders of app/(public)/[locale]. A page added there and
 * not here answers 404, in development as well, which is hard to miss, and
 * tests/e2e/404.spec.ts compares the two.
 */

/**
 * The request header that marks a public address nobody claims. Its value
 * is the locale to answer in.
 */
export const NOT_FOUND_HEADER = 'x-maze-not-found'

/**
 * A folder under [locale] that must never exist: /<locale>/nowhere is
 * where such a request is sent, for Next to find nothing there.
 */
export const NOWHERE = 'nowhere'

/** A segment only the store can vouch for. Here every value passes, and the page decides. */
const ANY = Symbol('any')

type Segment = string | readonly string[] | typeof ANY

// The journal: a list and its posts.
const INSIGHTS: ReadonlyArray<readonly Segment[]> = [['insights'], ['insights', ANY]]

const PAGES: ReadonlyArray<readonly Segment[]> = [
  [],
  ['about'],
  ['brief'],
  ['contact'],
  ['internship'],
  ['legal', LEGAL_SLUGS],
  ['portfolio'],
  ['portfolio', ANY],
  ['portfolio', 'category', VALID_CATEGORIES],
  ['portfolio', 'client', ANY],
  ['portfolio', 'tag', ANY],
  ['services'],
  ['services', SERVICE_SLUGS],
  // Switched off, it answers 404 (lib/features.ts).
  ...(INSIGHTS_ENABLED ? INSIGHTS : []),
]

/**
 * Pages only someone signed in to the admin can open: a post can be read
 * before Insights is switched on. The page checks the session itself; this
 * only keeps the middleware out of its way.
 */
const PREVIEWS: ReadonlyArray<readonly Segment[]> = INSIGHTS_ENABLED ? [] : INSIGHTS.slice(1)

function matches(page: readonly Segment[], segments: readonly string[]): boolean {
  return page.length === segments.length && page.every((want, i) => {
    if (want === ANY) return true
    return typeof want === 'string' ? want === segments[i] : want.includes(segments[i])
  })
}

/**
 * Whether a page claims this address. `segments` is the path below the
 * locale, split and decoded: /ru/portfolio/category/naming is
 * ['portfolio', 'category', 'naming'].
 */
export function isPublicPage(segments: readonly string[], signedIn = false): boolean {
  return PAGES.some((page) => matches(page, segments))
    || (signedIn && PREVIEWS.some((page) => matches(page, segments)))
}
