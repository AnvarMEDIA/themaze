'use client'

import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { motion, useInView, AnimatePresence, useReducedMotion } from 'framer-motion'

// Exactly 6 services — one href per service item (indices 0-5)
const SERVICE_HREFS = [
  '/services#branding',
  '/services#identity',
  '/services#naming',
  '/services#packaging',
  '/services#print',
  '/services#art-direction',
] as const

// Strong ease-out curve (Emil Kowalski)
const EASE_OUT = [0.23, 1, 0.32, 1] as const

export function ServicesSection() {
  const t            = useTranslations('services')
  const sectionRef   = useRef<HTMLElement>(null)
  const inView       = useInView(sectionRef, { once: true, margin: '-10% 0px' })
  const shouldReduce = useReducedMotion()
  const [active, setActive] = useState<number | null>(null)

  const items = (t.raw('items') as {
    title: string
    description: string
    tags: string[]
  }[]).slice(0, 6)

  return (
    <section
      ref={sectionRef}
      className="px-6 md:px-10 py-24 md:py-36 border-t border-maze-border"
    >
      {/* Header */}
      <div className="mb-14">
        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5 }}
          className="label-sm text-maze-muted mb-4"
        >
          {t('label')}
        </motion.p>
        <div className="overflow-hidden">
          <motion.h2
            initial={{ y: '100%' }}
            animate={inView ? { y: '0%' } : {}}
            transition={{ duration: 0.9, ease: EASE_OUT }}
            className="display-md text-maze-cream"
          >
            {t('heading')}
          </motion.h2>
        </div>
      </div>

      {/* Service list — stagger entrance */}
      <div className="border-t border-maze-border">
        {items.map((service, i) => (
          <motion.div
            key={i}
            initial={shouldReduce ? { opacity: 0 } : { opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{
              delay:    i * 0.07,
              duration: 0.55,
              ease:     EASE_OUT,
            }}
          >
            <div
              className="border-b border-maze-border py-6 md:py-8 cursor-default"
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
            >
              <div className="flex items-start justify-between gap-4">

                {/* Left: number + title + expand */}
                <div className="flex items-start gap-6 md:gap-10 flex-1 min-w-0">

                  {/* Number — 0X in muted color, far left */}
                  <span className="label-sm text-maze-muted pt-2 shrink-0 w-7 tabular-nums">
                    0{i + 1}
                  </span>

                  {/* Title + hover-expand description + tags */}
                  <div className="flex-1 min-w-0">
                    <h3
                      className="heading-lg text-maze-cream"
                      style={{
                        color:      active === i ? 'rgb(var(--lime))' : undefined,
                        transition: 'color 200ms ease-out',
                      }}
                    >
                      {service.title}
                    </h3>

                    {/* AnimatePresence expand: description + tags on hover */}
                    <AnimatePresence initial={false}>
                      {active === i && (
                        <motion.div
                          key="expand"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{
                            height:  { duration: 0.32, ease: EASE_OUT },
                            opacity: { duration: 0.22, ease: EASE_OUT },
                          }}
                          className="overflow-hidden"
                        >
                          <p className="body-lg text-maze-muted mt-3 max-w-xl">
                            {service.description}
                          </p>
                          {service.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-4 pb-1">
                              {service.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="label-sm px-3 py-1 border border-maze-border rounded-full text-maze-muted"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Arrow link — far right, rotates to upright on hover (↗) */}
                <Link
                  href={SERVICE_HREFS[i] ?? '/services'}
                  onClick={(e) => e.stopPropagation()}
                  className="shrink-0 w-10 h-10 rounded-full border flex items-center justify-center mt-1"
                  style={{
                    borderColor: active === i ? 'rgb(var(--lime))' : 'rgb(var(--border))',
                    color:       active === i ? 'rgb(var(--lime))' : 'rgb(var(--muted))',
                    transform:   active === i ? 'rotate(0deg)'    : 'rotate(-45deg)',
                    transition:  'border-color 200ms ease-out, color 200ms ease-out, transform 200ms cubic-bezier(0.23, 1, 0.32, 1)',
                  }}
                  aria-label={`Go to ${service.title}`}
                >
                  ↗
                </Link>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
