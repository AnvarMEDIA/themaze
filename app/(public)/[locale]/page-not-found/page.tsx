import { setRequestLocale } from 'next-intl/server'
import LocaleNotFound from '../not-found'

export { metadata } from '../not-found'

/**
 * The 404 screen as a page of its own, for the middleware to answer with.
 *
 * `notFound()` cannot be used for an address nobody claims: Next 14 turns it
 * into an empty document that a script fills in, a blank page with scripts
 * off. middleware.ts rewrites such an address here instead, with the status
 * set to 404, and this is rendered on the server like any other page, inside
 * the header and the footer. The visitor keeps the address they typed.
 *
 * Nothing links here, and opened by its own address it is one more address
 * nobody claims: the middleware answers it the same way, with a 404.
 */
export default function PageNotFound({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale)
  return <LocaleNotFound />
}
