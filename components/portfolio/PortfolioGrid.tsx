'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ProjectCard } from './ProjectCard'
import type { Project, ProjectCategory } from '@/lib/types'
import { CATEGORY_LABELS } from '@/lib/utils'

interface Props {
  projects: Project[]
}

const ALL = 'all'
type Filter = typeof ALL | ProjectCategory

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

export function PortfolioGrid({ projects }: Props) {
  const [filter, setFilter] = useState<Filter>(ALL)
  const [view,   setView]   = useState<'grid' | 'list'>('grid')

  const categories = Array.from(new Set(projects.map((p) => p.category))) as ProjectCategory[]

  const filtered = filter === ALL
    ? projects
    : projects.filter((p) => p.category === filter)

  const filterOptions = [
    { id: ALL as Filter, label: 'All Work', count: projects.length },
    ...categories.map((c) => ({ id: c as Filter, label: CATEGORY_LABELS[c], count: projects.filter((p) => p.category === c).length })),
  ]

  return (
    <div>
      {/* Controls bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">

        {/* Filter pills */}
        <div className="flex flex-wrap gap-2">
          {filterOptions.map(({ id, label, count }) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className={[
                'label-sm px-4 py-2 rounded-full border transition-all duration-200',
                filter === id
                  ? 'bg-maze-lime text-maze-ink border-maze-lime'
                  : 'bg-transparent text-maze-muted border-maze-border hover:border-maze-cream hover:text-maze-cream',
              ].join(' ')}
            >
              {label}
              <span className={[
                'ml-1.5 opacity-60',
                filter === id ? 'text-maze-ink' : '',
              ].join(' ')}>
                ({count})
              </span>
            </button>
          ))}
        </div>

        {/* Right side: count + view toggle */}
        <div className="flex items-center gap-4">
          <p className="label-sm text-maze-muted hidden sm:block">
            {filtered.length} {filtered.length === 1 ? 'project' : 'projects'}
          </p>

          <div className="flex gap-1 rounded-full p-1 border border-maze-border">
            {([
              { id: 'grid' as const, Icon: GridIcon, label: 'Grid view' },
              { id: 'list' as const, Icon: ListIcon, label: 'List view' },
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
      <p className="label-sm text-maze-muted mb-8 sm:hidden">
        {filtered.length} {filtered.length === 1 ? 'project' : 'projects'}
      </p>

      {/* Grid / List with AnimatePresence */}
      <AnimatePresence mode="wait">
        {filtered.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="text-center py-20"
          >
            <p className="body-lg text-maze-muted">No projects in this category yet.</p>
          </motion.div>
        ) : view === 'grid' ? (
          <motion.div
            key={`grid-${filter}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {filtered.map((project, i) => (
              <ProjectCard key={project.id} project={project} index={i} layout="grid" />
            ))}
          </motion.div>
        ) : (
          <motion.div
            key={`list-${filter}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            className="border-t border-maze-border"
          >
            {filtered.map((project, i) => (
              <ProjectCard key={project.id} project={project} index={i} layout="list" />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
