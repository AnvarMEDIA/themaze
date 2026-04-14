'use client'

import { useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, useInView } from 'framer-motion'
import type { Project } from '@/lib/types'
import { CATEGORY_LABELS } from '@/lib/utils'

interface Props {
  projects: Project[]
}

function ProjectCard({ project, index }: { project: Project; index: number }) {
  const ref    = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-15% 0px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 60 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.9, delay: index * 0.12, ease: [0.19, 1, 0.22, 1] }}
    >
      <Link
        href={`/portfolio/${project.slug}`}
        className="group block"
        data-cursor="view"
      >
        {/* Image */}
        <div className="relative overflow-hidden bg-maze-gray rounded-lg">
          <div
            className="aspect-[4/3] relative"
            style={{ aspectRatio: index % 3 === 0 ? '3/4' : '4/3' }}
          >
            <Image
              src={project.coverImage}
              alt={project.title}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
              }}
            />
            {/* Placeholder gradient */}
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(135deg, ${project.accentColor}33 0%, #1E1E1E 100%)`,
              }}
            />
            {/* Project initials */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span
                className="text-6xl font-black opacity-20"
                style={{ color: project.accentColor }}
              >
                {project.title.slice(0, 2).toUpperCase()}
              </span>
            </div>

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-maze-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
              <div>
                <p className="label-sm text-maze-lime mb-1">
                  {CATEGORY_LABELS[project.category]}
                </p>
                <p className="heading-md text-maze-cream">{project.title}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Meta */}
        <div className="mt-4 flex items-center justify-between">
          <div>
            <p className="font-semibold text-maze-cream group-hover:text-maze-lime transition-colors">
              {project.title}
            </p>
            <p className="label-sm text-maze-muted mt-0.5">
              {project.client} — {project.year}
            </p>
          </div>
          <span className="w-8 h-8 rounded-full border border-maze-border flex items-center justify-center text-maze-muted group-hover:border-maze-lime group-hover:text-maze-lime transition-all duration-300 -rotate-45 group-hover:rotate-0">
            ↗
          </span>
        </div>
      </Link>
    </motion.div>
  )
}

export function FeaturedWork({ projects }: Props) {
  const titleRef = useRef<HTMLDivElement>(null)
  const inView   = useInView(titleRef, { once: true, margin: '-10% 0px' })

  return (
    <section className="px-6 md:px-10 py-24 md:py-36">
      {/* Section header */}
      <div
        ref={titleRef}
        className="flex items-end justify-between mb-14 border-b border-maze-border pb-6"
      >
        <div>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="label-sm text-maze-muted mb-3"
          >
            Selected Work
          </motion.p>
          <div className="overflow-hidden">
            <motion.h2
              initial={{ y: '100%' }}
              animate={inView ? { y: '0%' } : {}}
              transition={{ duration: 0.8, ease: [0.19, 1, 0.22, 1] }}
              className="display-md text-maze-cream"
            >
              Featured Projects
            </motion.h2>
          </div>
        </div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.3 }}
        >
          <Link
            href="/portfolio"
            className="label-sm text-maze-muted hover:text-maze-lime transition-colors flex items-center gap-2"
          >
            View all work
            <span className="inline-block group-hover:translate-x-1 transition-transform">→</span>
          </Link>
        </motion.div>
      </div>

      {/* Asymmetric grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {projects.slice(0, 3).map((project, i) => (
          <ProjectCard key={project.id} project={project} index={i} />
        ))}
      </div>

      {/* Second row — offset */}
      {projects.length > 3 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5 lg:ml-[33.33%]">
          {projects.slice(3, 5).map((project, i) => (
            <ProjectCard key={project.id} project={project} index={i + 3} />
          ))}
        </div>
      )}
    </section>
  )
}
