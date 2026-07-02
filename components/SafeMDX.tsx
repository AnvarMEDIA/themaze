import { compileMDX } from 'next-mdx-remote/rsc'
import rehypeSanitize from 'rehype-sanitize'
import remarkGfm from 'remark-gfm'

const MDX_OPTIONS = {
  parseFrontmatter: false,
  mdxOptions: {
    format: 'md' as const,
    remarkPlugins: [remarkGfm],
    rehypePlugins: [rehypeSanitize],
  },
}

/**
 * Safe MDX renderer for user-supplied content.
 *
 * Hardening:
 *   - `format: 'md'` parses input as plain Markdown only — disables
 *     MDX JSX/expressions, so an admin cannot smuggle live React
 *     components or `<script>` tags through markdown.
 *   - `rehype-sanitize` strips disallowed HTML tags / attributes from
 *     the resulting tree (uses GitHub's allowlist by default).
 *   - `remark-gfm` enables tables, autolinks, strikethrough, task lists.
 *   - The compile is wrapped in try/catch so a single malformed post can
 *     never crash the route with a 500. On failure the raw text is
 *     rendered (React-escaped) so the page still opens and the author
 *     can see what to fix; the error is logged (captured by Sentry).
 *
 * Use this for any markdown that originates from user input
 * (insights posts, future user-editable docs).
 */
export async function SafeMDX({ source }: { source: string }) {
  if (!source || !source.trim()) return null

  try {
    const { content } = await compileMDX({ source, options: MDX_OPTIONS })
    return content
  } catch (err) {
    console.error('[SafeMDX] failed to render markdown — falling back to plain text', err)
    return <div className="whitespace-pre-wrap break-words">{source}</div>
  }
}
