'use client'

import { useTranslations, useLocale } from 'next-intl'
import { Link } from '@/i18n/navigation'
import Image from 'next/image'
import { Arrow } from '@/components/ui/Arrow'
import type { Project } from '@/lib/types'

interface Props {
  project: Project
  index: number
  layout?: 'grid' | 'list'
  /** Preload the cover. Defaults to the first card, which is the LCP on
   *  /portfolio; pass false where the grid starts below the fold. */
  priority?: boolean
}

// Hover effects only where there is a real pointer — a tap on a phone
// shouldn't leave a card stuck in its hover state.
const HOVER_LIME  = '[@media(hover:hover)_and_(pointer:fine)]:group-hover:text-maze-lime'
const HOVER_SCALE = '[@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-[1.03]'
const HOVER_NUDGE = '[@media(hover:hover)_and_(pointer:fine)]:group-hover:translate-x-1'

/**
 * A project, as a picture with its facts underneath. There used to be a
 * panel that slid up over the image on hover repeating those same facts —
 * invisible on touch screens, and on a mouse it covered the work itself.
 */
export function ProjectCard({ project, index, layout = 'grid', priority }: Props) {
  const t      = useTranslations('portfolio')
  const locale = useLocale()
  const catLabel = project.categories
    .map((c) => (t.raw('categories') as Record<string, string>)[c] ?? c)
    .join(' · ')

  const isRu  = locale === 'ru'
  const title = isRu ? (project.titleRu || project.title) : project.title
  const year  = project.showYear !== false ? project.year : null

  if (layout === 'list') {
    return (
      <div className="border-b border-maze-border">
        <Link
          href={`/portfolio/${project.slug}`}
          className="group grid grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,1fr)_minmax(0,16rem)_3.5rem_1rem] items-baseline gap-x-6 py-5 md:py-6"
        >
          <div className="min-w-0">
            <h3 className={`heading-md text-maze-cream truncate transition-colors duration-200 ${HOVER_LIME}`}>
              {title}
            </h3>
            <p className="mt-1 text-sm text-maze-muted">{project.client}</p>
          </div>
          <span className="hidden md:block text-sm text-maze-muted truncate">{catLabel}</span>
          <span className="font-mono text-xs text-maze-muted text-right">{year}</span>
          <Arrow
            direction="right"
            className={`hidden md:block text-maze-muted transition-transform duration-200 ease-out ${HOVER_NUDGE}`}
          />
        </Link>
      </div>
    )
  }

  return (
    <Link href={`/portfolio/${project.slug}`} className="group block">
      <div className="relative aspect-[16/9] overflow-hidden rounded-sm bg-maze-gray">
        {/* Under the image, and what shows if it fails to load. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center"
          style={{ background: `linear-gradient(135deg, ${project.accentColor}22 0%, rgb(var(--gray)) 100%)` }}
        >
          <span className="text-6xl font-extrabold opacity-15" style={{ color: project.accentColor }}>
            {project.title.slice(0, 2)}
          </span>
        </div>
        <Image
          src={project.coverImage}
          alt={title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          // The first card is the largest thing above the fold on every
          // portfolio screen — it IS the LCP there, so it is preloaded.
          priority={priority ?? index === 0}
          className={`object-cover transition-transform duration-500 ease-out ${HOVER_SCALE}`}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
      </div>
      <div className="mt-4 flex items-baseline justify-between gap-4">
        <h3 className={`font-semibold text-maze-cream transition-colors duration-200 ${HOVER_LIME}`}>
          {title}
        </h3>
        {year && <span className="shrink-0 font-mono text-xs text-maze-muted">{year}</span>}
      </div>
      <p className="mt-1 text-sm text-maze-muted">
        {project.client}
        {catLabel && <span aria-hidden="true"> · </span>}
        {catLabel}
      </p>
    </Link>
  )
}
