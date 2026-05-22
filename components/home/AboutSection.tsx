'use client'

import { useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { motion, useInView, useScroll, useTransform, useReducedMotion } from 'framer-motion'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'

// Strong ease-out curve (Emil Kowalski)
const EASE_OUT = [0.23, 1, 0.32, 1] as const

export function AboutSection() {
  const t            = useTranslations('about')
  const sectionRef   = useRef<HTMLElement>(null)
  const inView       = useInView(sectionRef, { once: true, margin: '-10% 0px' })
  const shouldReduce = useReducedMotion()

  // Subtle parallax on right column — disabled for reduced-motion
  const { scrollYProgress } = useScroll({
    target:  sectionRef,
    offset:  ['start end', 'end start'],
  })
  const y = useTransform(scrollYProgress, [0, 1], shouldReduce ? [0, 0] : [-24, 24])

  const stats = [
    { value: 200, suffix: '+', label: t('stats.projects')   },
    { value: 6,   suffix: '+', label: t('stats.years')      },
    { value: 80,  suffix: '+', label: t('stats.clients')    },
    { value: 5,   suffix: '+', label: t('stats.countries')  },
  ]

  return (
    <section
      ref={sectionRef}
      className="px-6 md:px-10 py-24 md:py-36 border-t border-maze-border"
    >
      <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-start">

        {/* ── Left column ───────────────────────────────────────── */}
        <div>
          {/* Label */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, ease: EASE_OUT }}
            className="label-sm text-maze-muted mb-6"
          >
            {t('label')}
          </motion.p>

          {/* Big heading — "We navigate complexity." */}
          <div className="overflow-hidden mb-6">
            <motion.h2
              initial={{ y: '100%' }}
              animate={inView ? { y: '0%' } : {}}
              transition={{ duration: 0.9, ease: EASE_OUT }}
              className="display-md text-maze-cream pb-[0.18em]"
            >
              {t('heading')}
            </motion.h2>
          </div>

          {/* Paragraph 1 */}
          <motion.p
            initial={shouldReduce ? { opacity: 0 } : { opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.28, duration: 0.7, ease: EASE_OUT }}
            className="body-lg text-maze-muted max-w-lg mb-6"
          >
            {t('body1')}
          </motion.p>

          {/* Paragraph 2 */}
          <motion.p
            initial={shouldReduce ? { opacity: 0 } : { opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.42, duration: 0.7, ease: EASE_OUT }}
            className="body-lg text-maze-muted max-w-lg mb-10"
          >
            {t('body2')}
          </motion.p>

          {/* CTA — "Our story →" */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.58, duration: 0.5, ease: EASE_OUT }}
          >
            <Link
              href="/about"
              className="inline-flex items-center gap-3 label-sm text-maze-lime border border-maze-lime px-6 py-3 rounded-full active:scale-[0.97]"
              style={{
                transition: 'background-color 200ms ease-out, color 200ms ease-out, transform 150ms ease-out',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget
                el.style.backgroundColor = 'rgb(var(--lime))'
                el.style.color = '#0A0A0A'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget
                el.style.backgroundColor = ''
                el.style.color = ''
              }}
            >
              {t('cta')} →
            </Link>
          </motion.div>
        </div>

        {/* ── Right column — stats card + blockquote ────────────── */}
        <motion.div style={{ y }} className="space-y-6">

          {/* Stats card — dark bg, 2×2 grid with AnimatedCounters */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.15, duration: 0.8, ease: EASE_OUT }}
            className="rounded-xl border border-maze-border bg-maze-dark p-8 relative overflow-hidden"
          >
            {/* Subtle dot grid inside card */}
            <div
              aria-hidden
              className="absolute inset-0 opacity-[0.35]"
              style={{
                backgroundImage: 'radial-gradient(circle, rgba(200,255,71,0.25) 1px, transparent 1px)',
                backgroundSize:  '28px 28px',
              }}
            />
            {/* 2×2 stats grid */}
            <div className="relative z-10 grid grid-cols-2 gap-5">
              {stats.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={shouldReduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{
                    delay:    0.22 + i * 0.08,
                    duration: 0.6,
                    ease:     EASE_OUT,
                  }}
                  className="p-5 rounded-lg bg-maze-gray/50 border border-maze-border"
                >
                  <div className="heading-lg text-maze-lime font-black">
                    <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                  </div>
                  <p className="label-sm text-maze-muted mt-1">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Blockquote */}
          <motion.blockquote
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ delay: 0.65, duration: 0.6 }}
            className="border-l-2 border-maze-lime pl-5 body-lg text-maze-muted italic"
          >
            &ldquo;{t('quote')}&rdquo;
          </motion.blockquote>
        </motion.div>

      </div>
    </section>
  )
}
