import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

/**
 * For a form that a script sends (contact, brief, internship).
 *
 * Without scripts the page is still readable and the form is still there,
 * but its button can only reload the page: what the visitor wrote is gone
 * and nothing tells them it was never sent. So where no script runs the
 * form says so before they start typing, and points at the contacts in the
 * footer. A browser that runs scripts never shows a <noscript>.
 *
 * `className` goes on the paragraph, not on the <noscript>: spacing has to
 * live on something that is certain to be a block. The <noscript> itself is
 * an inline box, which is why it can sit in a `space-y-*` column without
 * picking up that column's top margin.
 */
export function FormNeedsScript({ className }: { className?: string }) {
  const t = useTranslations('noscript')

  return (
    <noscript>
      <p
        className={cn(
          'border border-maze-border rounded-lg px-4 py-3.5 text-sm leading-relaxed text-maze-cream',
          className,
        )}
      >
        {t('form')}
      </p>
    </noscript>
  )
}
