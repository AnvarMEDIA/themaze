import { notFound } from 'next/navigation'

/**
 * Any address under a locale that no page claims — /ru/uslugi, a mistyped
 * case study — lands here and hands over to the localized 404 in
 * ../not-found.tsx, inside the site's header and footer. Without this, Next
 * served the bare root 404 (app/not-found.tsx), which is English only.
 */
export default function CatchAll() {
  notFound()
}
