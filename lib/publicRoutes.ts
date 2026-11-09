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

/**
 * What only the store knows: which projects, clients, tags and posts there
 * are today, and which categories have a project in them.
 */
export const STORE_KINDS = ['project', 'client', 'tag', 'category', 'post'] as const

export type StoreKind = (typeof STORE_KINDS)[number]

/** A segment the store has to vouch for, out of a fixed list where there is one. */
interface Stored {
  kind:   StoreKind
  among?: readonly string[]
}

type Segment = string | readonly string[] | Stored

type Page = readonly Segment[]

const SITE: readonly Page[] = [
  [],
  ['about'],
  ['brief'],
  ['contact'],
  ['internship'],
  ['legal', LEGAL_SLUGS],
  ['portfolio'],
  ['portfolio', { kind: 'project' }],
  ['portfolio', 'category', { kind: 'category', among: VALID_CATEGORIES }],
  ['portfolio', 'client', { kind: 'client' }],
  ['portfolio', 'tag', { kind: 'tag' }],
  ['services'],
  ['services', SERVICE_SLUGS],
]

// The journal: its list and its posts. Switched off, both answer 404
// (lib/features.ts).
const JOURNAL: readonly Page[] = [
  ['insights'],
  ['insights', { kind: 'post' }],
]

const PAGES: readonly Page[] = INSIGHTS_ENABLED ? [...SITE, ...JOURNAL] : SITE

/**
 * Open to someone signed in to the admin only: a post can be read before
 * Insights is switched on.
 */
const PREVIEWS: readonly Page[] = INSIGHTS_ENABLED ? [] : JOURNAL.slice(1)

/** Every page folder as a pattern, 'portfolio/category/*'. For the test that compares them with the folders. */
export const PAGE_PATTERNS: readonly string[] = [...SITE, ...JOURNAL].map((page) =>
  page.map((segment) => (typeof segment === 'string' ? segment : '*')).join('/'),
)

/** A page claims the address if the store has this. */
export interface StoreQuestion {
  kind: StoreKind
  slug: string
}

function match(page: Page, segments: readonly string[]): boolean | StoreQuestion {
  if (page.length !== segments.length) return false
  let question: StoreQuestion | null = null
  for (let i = 0; i < page.length; i++) {
    const want = page[i]
    const have = segments[i]
    if (typeof want === 'string') {
      if (want !== have) return false
    } else if ('kind' in want) {
      if (want.among && !want.among.includes(have)) return false
      question = { kind: want.kind, slug: have }
    } else if (!want.includes(have)) {
      return false
    }
  }
  return question ?? true
}

/**
 * Whether a page claims this address: yes, no, or a question for the store.
 * `segments` is the path below the locale, split and decoded:
 * /ru/portfolio/category/naming is ['portfolio', 'category', 'naming'].
 *
 * Someone signed in to the admin gets a yes where the store would be asked:
 * they can open drafts, which the page checks against their session itself.
 */
export function claimOn(segments: readonly string[], signedIn = false): boolean | StoreQuestion {
  for (const page of PAGES) {
    const found = match(page, segments)
    if (found) return signedIn ? true : found
  }
  return signedIn && PREVIEWS.some((page) => match(page, segments))
}
