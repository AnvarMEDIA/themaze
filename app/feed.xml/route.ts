import { getPublishedPosts } from '@/lib/posts'
import { SITE_URL, localeHref } from '@/lib/seo'

// The post store is treated as dynamic everywhere else in the app; match
// that and let the CDN cache the rendered feed via Cache-Control instead.
export const dynamic = 'force-dynamic'

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * RSS 2.0 feed for the Insights blog. Canonical (English) URLs so
 * aggregators and readers have a single source per post. Linked from
 * the document head via `alternates.types` in the root layout.
 */
export async function GET() {
  const posts = await getPublishedPosts()
  const feedUrl  = `${SITE_URL}/feed.xml`
  const indexUrl = localeHref('en', 'insights')

  // An empty journal used to report 1 Jan 1970, which reads to a feed reader
  // or a crawler as a broken feed rather than an empty one. Omit the element
  // entirely instead — it is optional in RSS 2.0.
  const lastBuild = posts.length
    ? new Date(
        Math.max(...posts.map((p) => new Date(p.updatedAt || p.publishedAt).getTime())),
      ).toUTCString()
    : null

  const items = posts
    .map((post) => {
      const url = localeHref('en', `insights/${post.slug}`)
      const categories = post.tags
        .map((tag) => `      <category>${escapeXml(tag)}</category>`)
        .join('\n')
      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>
${post.author ? `      <dc:creator>${escapeXml(post.author)}</dc:creator>\n` : ''}${categories ? categories + '\n' : ''}      <description>${escapeXml(post.excerpt || '')}</description>
    </item>`
    })
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>MAZE Studio — Insights</title>
    <link>${indexUrl}</link>
    <description>Branding, design and strategy notes from MAZE Studio — Tashkent, Uzbekistan.</description>
    <language>en</language>
${lastBuild ? `    <lastBuildDate>${lastBuild}</lastBuildDate>\n` : ''}    <atom:link href="${feedUrl}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
