import { Link } from '@/i18n/navigation'
import { Arrow } from '@/components/ui/Arrow'

/**
 * How every homepage section opens: a rule, the heading in plain sentence
 * case, and — when there is more — where to find it. No eyebrow label above
 * the heading saying the same thing again in capitals.
 */
export function SectionHead({ title, link }: { title: string; link?: { href: string; label: string } }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-t border-maze-border pt-6 mb-8 md:mb-12">
      <h2 className="heading-lg text-maze-cream">{title}</h2>
      {link && (
        <Link href={link.href} className="link-arrow">
          {link.label}
          <Arrow direction="right" className="text-base" />
        </Link>
      )}
    </div>
  )
}
