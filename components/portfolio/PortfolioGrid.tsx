'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from '@/i18n/navigation'
import { ProjectCard } from './ProjectCard'
import type { Project, ProjectCategory } from '@/lib/types'

interface Props {
  projects: Project[]
  /** Set on a category landing page — disables client-side category
   *  switching; chips become navigation links instead. */
  activeCategory?: ProjectCategory
}

const ALL = 'all'

const GridIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <rect x="0" y="0" width="7" height="7" fill="currentColor" rx="1.5" />
    <rect x="9" y="0" width="7" height="7" fill="currentColor" rx="1.5" />
    <rect x="0" y="9" width="7" height="7" fill="currentColor" rx="1.5" />
    <rect x="9" y="9" width="7" height="7" fill="currentColor" rx="1.5" />
  </svg>
)

const ListIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <rect x="0" y="2" width="16" height="2" fill="currentColor" rx="1" />
    <rect x="0" y="7" width="16" height="2" fill="currentColor" rx="1" />
    <rect x="0" y="12" width="16" height="2" fill="currentColor" rx="1" />
  </svg>
)

export function PortfolioGrid({ projects, activeCategory }: Props) {
  const t = useTranslations('portfolio')
  const [view, setView] = useState<'grid' | 'list'>('grid')

  // Chip counts are computed against the full input list, so a
  // category page shows "Branding (12) · Identity (8) · …" rather
  // than only the categories present in the filtered slice.
  const allCats = Array.from(new Set(projects.flatMap((p) => p.categories))) as ProjectCategory[]
  const currentKey: ProjectCategory | 'all' = activeCategory ?? ALL
  const visible = activeCategory
    ? projects.filter((p) => p.categories.includes(activeCategory))
    : projects

  const catLabel = (cat: string) => t.raw('categories')[cat] ?? cat

  const filterOptions = [
    { id: ALL as 'all', label: t('allWork'), count: projects.length, href: '/portfolio' as const },
    ...allCats.map((c) => ({
      id:    c,
      label: catLabel(c),
      count: projects.filter((p) => p.categories.includes(c)).length,
      href:  `/portfolio/category/${c}` as const,
    })),
  ]

  const countText = visible.length === 1
    ? `${visible.length} ${t('projectSingular')}`
    : `${visible.length} ${t('projectPlural')}`

  return (
    <div>
      {/* Controls bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">

        {/* Filter pills — real links so each category gets its own
            indexable URL. The grid below is server-rendered for the
            current page, so navigation also changes the count above. */}
        <div className="flex flex-wrap gap-2">
          {filterOptions.map(({ id, label, count, href }) => {
            const isActive = currentKey === id
            return (
              <Link
                key={id}
                href={href}
                aria-current={isActive ? 'page' : undefined}
                className={[
                  'label-sm px-4 py-2 rounded-full border transition-all duration-200',
                  isActive
                    ? 'bg-maze-lime text-maze-ink border-maze-lime'
                    : 'bg-transparent text-maze-muted border-maze-border hover:border-maze-cream hover:text-maze-cream',
                ].join(' ')}
              >
                {label}
                <span className={['ml-1.5 opacity-60', isActive ? 'text-maze-ink' : ''].join(' ')}>
                  ({count})
                </span>
              </Link>
            )
          })}
        </div>

        {/* Right side: count + view toggle */}
        <div className="flex items-center gap-4">
          <p className="label-sm text-maze-muted hidden sm:block">{countText}</p>

          <div className="flex gap-1 rounded-full p-1 border border-maze-border">
            {([
              { id: 'grid' as const, Icon: GridIcon, label: t('gridView') },
              { id: 'list' as const, Icon: ListIcon, label: t('listView') },
            ] as const).map(({ id, Icon, label }) => (
              <button
                key={id}
                onClick={() => setView(id)}
                title={label}
                aria-label={label}
                aria-pressed={view === id}
                className={[
                  'p-2 rounded-full transition-colors duration-150',
                  view === id
                    ? 'bg-maze-lime/10 text-maze-lime'
                    : 'text-maze-muted hover:text-maze-cream',
                ].join(' ')}
              >
                <Icon />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile count */}
      <p className="label-sm text-maze-muted mb-8 sm:hidden">{countText}</p>

      {/* Grid / List */}
      <AnimatePresence mode="wait">
        {visible.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="text-center py-20"
          >
            <p className="body-lg text-maze-muted">{t('empty')}</p>
          </motion.div>
        ) : view === 'grid' ? (
          <motion.div
            key={`grid-${currentKey}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {visible.map((project, i) => (
              <ProjectCard key={project.id} project={project} index={i} layout="grid" />
            ))}
          </motion.div>
        ) : (
          <motion.div
            key={`list-${currentKey}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            className="border-t border-maze-border"
          >
            {visible.map((project, i) => (
              <ProjectCard key={project.id} project={project} index={i} layout="list" />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
