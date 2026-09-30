/**
 * The nine services, in the order the site presents them. Each one has a
 * page at /services/<slug> and a portfolio category with the same slug.
 *
 * Kept in a module of its own, with no imports, so client components can use
 * the list without pulling in the message files that lib/llms.ts reads.
 */
export const SERVICE_SLUGS = [
  'branding', 'rebranding', 'identity', 'naming',
  'packaging', 'ui-ux', 'print', 'motion', 'strategy',
] as const

export type ServiceSlug = (typeof SERVICE_SLUGS)[number]

export function isServiceSlug(s: string): s is ServiceSlug {
  return (SERVICE_SLUGS as readonly string[]).includes(s)
}
