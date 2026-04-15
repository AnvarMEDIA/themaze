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

export function PortfolioGrid({ projects }: Props) {
  const [filter, setFilter] = useState<Filter>(ALL)
  const [view,   setView]   = useState<'grid' | 'list'>('grid')

  const categories = Array.from(new Set(projects.map((p) => p.category))) as ProjectCategory[]

  const filtered = filter === ALL
    ? projects
    : projects.filter((p) => p.category === filter)

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-10">
        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {[{ id: ALL, label: `All (${projects.length})` }, ...categories.map((c) => ({ id: c, label: CATEGORY_LABELS[c] }))].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setFilter(id as Filter)}
              className={`label-sm px-4 py-2 rounded-full border transition-all duration-200 ${
                filter === id
                  ? 'border-maze-lime text-maze-ink bg-maze-lime'
                  : 'border-maze-border text-maze-muted hover:border-maze-cream hover:text-maze-cream'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* View toggle */}
        <div className="flex gap-1 rounded-full p-1 border border-maze-border">
          {[
            { id: 'grid' as const, icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="0" y="0" width="6" height="6" fill="currentColor" rx="1"/><rect x="8" y="0" width="6" height="6" fill="currentColor" rx="1"/><rect x="0" y="8" width="6" height="6" fill="currentColor" rx="1"/><rect x="8" y="8" width="6" height="6" fill="currentColor" rx="1"/></svg>, label: 'Grid view' },
            { id: 'list' as const, icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="0" y="1" width="14" height="2" fill="currentColor" rx="1"/><rect x="0" y="6" width="14" height="2" fill="currentColor" rx="1"/><rect x="0" y="11" width="14" height="2" fill="currentColor" rx="1"/></svg>, label: 'List view' },
          ].map(({ id, icon, label }) => (
            <button
              key={id}
              onClick={() => setView(id)}
              title={label}
              className={`p-2 rounded-full transition-colors ${view === id ? 'text-maze-lime' : 'text-maze-muted hover:text-maze-cream'}`}
            >
              {icon}
            </button>
          ))}
        </div>
      </div>

      {/* Count */}
      <p className="label-sm text-maze-muted mb-8">
        {filtered.length} {filtered.length === 1 ? 'project' : 'projects'}
      </p>

      {/* Grid / List */}
      <AnimatePresence mode="wait">
        {view === 'grid' ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {filtered.map((project, i) => (
              <ProjectCard key={project.id} project={project} index={i} layout="grid" />
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="border-t border-maze-border"
          >
            {filtered.map((project, i) => (
              <ProjectCard key={project.id} project={project} index={i} layout="list" />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {filtered.length === 0 && (
        <div className="text-center py-20">
          <p className="body-lg text-maze-muted">No projects in this category yet.</p>
        </div>
      )}
    </div>
  )
}
