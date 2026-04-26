import { MDXRemote } from 'next-mdx-remote/rsc'
import rehypeSanitize from 'rehype-sanitize'
import remarkGfm from 'remark-gfm'

/**
 * Safe MDX renderer for user-supplied content.
 *
 * Hardening:
 *   - `format: 'md'` parses input as plain Markdown only — disables
 *     MDX JSX components/imports, so an admin cannot smuggle live
 *     React components or `<script>` tags through markdown.
 *   - `rehype-sanitize` strips disallowed HTML tags / attributes from
 *     the resulting tree (uses GitHub's allowlist by default).
 *   - `remark-gfm` enables tables, autolinks, strikethrough, task
 *     lists — common GitHub-flavoured Markdown features.
 *
 * Use this for any markdown that originates from user input
 * (insights posts, future user-editable docs). Static disk-only
 * content can use it too as defence-in-depth.
 */
export function SafeMDX({ source }: { source: string }) {
  return (
    <MDXRemote
      source={source}
      options={{
        parseFrontmatter: false,
        mdxOptions: {
          format: 'md',
          remarkPlugins: [remarkGfm],
          rehypePlugins: [rehypeSanitize],
        },
      }}
    />
  )
}
