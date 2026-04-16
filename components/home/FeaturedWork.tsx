'use client'

import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import Image from 'next/image'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import type { Project } from '@/lib/types'
import { CATEGORY_LABELS } from '@/lib/utils'

interface Props {
  projects: Project[]
}

function pickRandom3(arr: Project[]): Project[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy.slice(0, 3)
}

// Strong ease-out curve (Emil Kowalski)
const EASE_OUT = [0.23, 1, 0.32, 1] as const

// ─── Single 16:9 project card ────────────────────────────────────────────────
function ProjectCard({
  project,
  index,
  large = false,
}: {
  project: Project
  index: number
  large?: boolean
}) {
  const ref          = useRef<HTMLDivElement>(null)
  const inView       = useInView(ref, { once: true, margin: '-12% 0px' })
  const shouldReduce = useReducedMotion()
  const [hovered, setHovered] = useState(false)

  return (
    <motion.div
      ref={ref}
      initial={shouldReduce ? { opacity: 0 } : { opacity: 0, y: 48 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{
        duration: 0.8,
        delay:    index * 0.1,
        ease:     EASE_OUT,
      }}
    >
      <Link
        href={`/portfolio/${project.slug}`}
        className="group block"
        data-cursor="view"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* 16:9 image container */}
        <div className="relative aspect-[16/9] overflow-hidden rounded-xl bg-maze-gray">

          {/* Placeholder — accent gradient + project initials (shown beneath image) */}
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${project.accentColor}44 0%, rgb(var(--gray)) 100%)`,
            }}
          >
            <span
              className="font-black opacity-20 select-none"
              style={{
                color:    project.accentColor,
                fontSize: large ? '6rem' : '4rem',
              }}
            >
              {project.title.slice(0, 2).toUpperCase()}
            </span>
          </div>

          {/* Actual image — layered on top of placeholder */}
          <Image
            src={project.coverImage}
            alt={project.title}
            fill
            sizes={large ? '100vw' : '(max-width: 768px) 100vw, 50vw'}
            className="object-cover"
            style={{
              transition: 'transform 700ms cubic-bezier(0.23, 1, 0.32, 1)',
              transform: hovered ? 'scale(1.05)' : 'scale(1)',
            }}
            onError={(e) => {
              ;(e.target as HTMLImageElement).style.display = 'none'
            }}
          />

          {/* Hover overlay — slides UP from bottom (translateY 100% → 0) */}
          {/* Gate hover behind pointer-fine media — CSS handles this naturally */}
          <div
            className="absolute inset-0 overflow-hidden rounded-xl"
            aria-hidden
          >
            <div
              className="absolute inset-0 bg-maze-black/80 flex flex-col justify-end p-6 md:p-8"
              style={{
                transform: shouldReduce
                  ? 'none'
                  : hovered ? 'translateY(0%)' : 'translateY(100%)',
                opacity: shouldReduce ? (hovered ? 1 : 0) : 1,
                transition: shouldReduce
                  ? 'opacity 200ms ease-out'
                  : 'transform 320ms cubic-bezier(0.23, 1, 0.32, 1)',
              }}
            >
              <p className="label-sm text-maze-lime mb-2">
                {CATEGORY_LABELS[project.category] ?? project.category}
              </p>
              <p
                className={`text-maze-cream font-bold leading-tight ${
                  large ? 'heading-lg' : 'heading-md'
                }`}
              >
                {project.title}
              </p>
              <span className="mt-4 inline-flex w-9 h-9 rounded-full border border-maze-lime items-center justify-center text-maze-lime text-sm shrink-0">
                ↗
              </span>
            </div>
          </div>
        </div>

        {/* Below-card meta: title + client left, year right */}
        <div className="mt-4 flex items-start justify-between gap-4">
          <div>
            <p
              className="font-semibold text-maze-cream"
              style={{
                color: hovered ? 'rgb(var(--lime))' : undefined,
                transition: 'color 200ms ease-out',
              }}
            >
              {project.title}
            </p>
            <p className="label-sm text-maze-muted mt-0.5">{project.client}</p>
          </div>
          <span className="label-sm text-maze-muted shrink-0 pt-0.5">{project.year}</span>
        </div>
      </Link>
    </motion.div>
  )
}

// ─── Section ─────────────────────────────────────────────────────────────────
export function FeaturedWork({ projects }: Props) {
  const t         = useTranslations('featured')
  const headerRef = useRef<HTMLDivElement>(null)
  const inView    = useInView(headerRef, { once: true, margin: '-8% 0px' })

  // Pick 3 random projects on mount — re-randomises on every page load/refresh
  const [featured] = useState<Project[]>(() =>
    projects.length > 0 ? pickRandom3(projects) : []
  )

  return (
    <section className="px-6 md:px-10 py-24 md:py-36">

      {/* Section header */}
      <div
        ref={headerRef}
        className="flex items-center justify-between mb-14 border-b border-maze-border pb-6"
      >
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease: EASE_OUT }}
          className="label-sm text-maze-muted"
        >
          {t('label')}
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <Link
            href="/portfolio"
            className="label-sm text-maze-muted flex items-center gap-2"
            style={{ transition: 'color 200ms ease-out' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'rgb(var(--lime))' }}
            onMouseLeave={e => { e.currentTarget.style.color = '' }}
          >
            {t('viewAll')} →
          </Link>
        </motion.div>
      </div>

      {/* 3 random projects — single row, equal 16:9 cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {featured.map((project, i) => (
          <ProjectCard key={project.id} project={project} index={i} />
        ))}
      </div>

    </section>
  )
}
