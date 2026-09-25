import { cn } from '@/lib/utils'

interface Props {
  children: string
  className?: string
  /** Kept for call-site compatibility; there is no animation to delay. */
  delay?: number
  once?: boolean
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span'
  /** Kept for call-site compatibility; words are no longer animated one by one. */
  stagger?: boolean
}

/**
 * A heading, set and left alone.
 *
 * This used to slide every word up out of its own `overflow: hidden` mask —
 * the split-text reveal that ships with every agency template. Two problems
 * with it beyond the cliché. The masks cut the descenders off at display
 * sizes: with leading under 1, the tail of a g or a y falls outside the word's
 * box, so "something great" rendered as "somethinq qreat" on the homepage. And
 * the words started invisible, so any visitor who scrolled faster than the
 * stagger read a half-built sentence.
 *
 * Headings now render exactly as written, from the first frame. The name is
 * kept so the pages that use it need no change; `delay`, `once` and `stagger`
 * are accepted and ignored.
 */
export function TextReveal({ children, className, as: Tag = 'span' }: Props) {
  return <Tag className={cn(className)}>{children}</Tag>
}
