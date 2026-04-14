'use client'

import { useRef } from 'react'
import { Link } from '@/i18n/navigation'
import Image from 'next/image'
import { motion, useInView } from 'framer-motion'
import type { Project } from '@/lib/types'
import { CATEGORY_LABELS } from '@/lib/utils'

interface Props {
  project: Project
  index: number
  layout?: 'grid' | 'list'
}

export function ProjectCard({ project, index, layout = 'grid' }: Props) {
  const ref    = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-10% 0px' })

  if (layout === 'list') {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 30 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ delay: index * 0.06, duration: 0.7, ease: [0.19, 1, 0.22, 1] }}
        className="border-b border-maze-border"
      >
        <Link
          href={`/portfolio/${project.slug}`}
          className="flex items-center justify-between py-6 md:py-8 group gap-4"
          data-cursor="view"
        >
          <div className="flex items-center gap-6 md:gap-10 flex-1 min-w-0">
            <span className="label-sm text-maze-muted w-6 shrink-0">{String(index + 1).padStart(2, '0')}</span>
            <div className="min-w-0">
              <h3 className="heading-md text-maze-cream group-hover:text-maze-lime transition-colors truncate">
                {project.title}
              </h3>
              <p className="label-sm text-maze-muted mt-1">{project.client}</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-6 shrink-0">
            <span className="label-sm text-maze-muted">{CATEGORY_LABELS[project.category]}</span>
            <span className="label-sm text-maze-muted">{project.year}</span>
          </div>
          <span className="shrink-0 w-10 h-10 rounded-full border border-maze-border flex items-center justify-center text-maze-muted group-hover:border-maze-lime group-hover:text-maze-lime transition-all -rotate-45 group-hover:rotate-0">
            ↗
          </span>
        </Link>
      </motion.div>
    )
  }

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 60 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: index * 0.08, duration: 0.8, ease: [0.19, 1, 0.22, 1] }}
    >
      <Link
        href={`/portfolio/${project.slug}`}
        className="group block"
        data-cursor="view"
      >
        {/* Image wrapper */}
        <div className="relative overflow-hidden rounded-xl bg-maze-gray">
          <div className="aspect-[4/3] relative">
            <Image
              src={project.coverImage}
              alt={project.title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
            {/* Colour placeholder */}
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${project.accentColor}22 0%, #1A1A1A 100%)`,
              }}
            >
              <span className="text-7xl font-black opacity-10" style={{ color: project.accentColor }}>
                {project.title.slice(0, 2)}
              </span>
            </div>

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-maze-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-6">
              <div className="flex justify-between items-start">
                <span className="label-sm text-maze-lime">{CATEGORY_LABELS[project.category]}</span>
                <span className="label-sm text-maze-muted">{project.year}</span>
              </div>
              <p className="body-lg text-maze-muted line-clamp-2">{project.shortDescription}</p>
            </div>
          </div>
        </div>

        {/* Meta */}
        <div className="mt-4 flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold text-maze-cream group-hover:text-maze-lime transition-colors">
              {project.title}
            </h3>
            <p className="label-sm text-maze-muted mt-1">
              {project.client}
            </p>
          </div>
          <span className="shrink-0 label-sm text-maze-muted pt-0.5">{project.year}</span>
        </div>
      </Link>
    </motion.div>
  )
}
