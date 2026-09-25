import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'

export interface TrailStep {
  label: string
  /** Omit for the current page. */
  href?: string
}

/**
 * Where you are, and the way back: MAZE / Services / Branding.
 *
 * Inner pages used to open with an eyebrow label — "WHAT WE OFFER", "ABOUT
 * US", "GET IN TOUCH" — repeating the heading under it in capitals. The same
 * spot now holds the path to the page, which every level of it links back
 * along, and which matches the BreadcrumbList each page already publishes.
 */
export function Trail({ steps }: { steps: TrailStep[] }) {
  const t = useTranslations('nav')
  const link = 'inline-block py-1.5 transition-colors duration-200 hover:text-maze-cream'

  return (
    <nav aria-label={t('breadcrumb')} className="mb-5 md:mb-7">
      <ol className="flex flex-wrap items-center gap-x-2 font-mono text-xs text-maze-muted">
        <li>
          <Link href="/" className={link}>{t('home')}</Link>
        </li>
        {steps.map((step) => (
          <li key={step.label} className="flex items-center gap-x-2 min-w-0">
            <span aria-hidden="true" className="text-maze-border">/</span>
            {step.href ? (
              <Link href={step.href} className={link}>{step.label}</Link>
            ) : (
              <span aria-current="page" className="py-1.5 text-maze-cream truncate">{step.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
