'use client'

import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { motion, useInView, AnimatePresence } from 'framer-motion'

const SERVICE_HREFS = [
  '/services#brand-identity',
  '/services#strategy',
  '/services#naming',
  '/services#ui-ux',
  '/services#print',
  '/services#motion',
  '/services#art-direction',
]

export function ServicesSection() {
  const t      = useTranslations('services')
  const ref    = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, margin: '-10% 0px' })
  const [active, setActive] = useState<number | null>(null)

  const items = t.raw('items') as {
    title: string
    description: string
    tags: string[]
  }[]

  return (
    <section
      ref={ref}
      className="px-6 md:px-10 py-24 md:py-36 border-t border-maze-border"
    >
      {/* Header */}
      <div className="mb-14">
        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          className="label-sm text-maze-muted mb-4"
        >
          {t('label')}
        </motion.p>
        <div className="overflow-hidden">
          <motion.h2
            initial={{ y: '100%' }}
            animate={inView ? { y: '0%' } : {}}
            transition={{ duration: 0.9, ease: [0.19, 1, 0.22, 1] }}
            className="display-md text-maze-cream"
          >
            {t('heading')}
          </motion.h2>
        </div>
      </div>

      {/* Service list */}
      <div className="border-t border-maze-border">
        {items.map((service, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: i * 0.07, duration: 0.6 }}
          >
            <div
              className="border-b border-maze-border py-6 md:py-8 group cursor-default"
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-6 md:gap-10 flex-1">
                  <span className="label-sm text-maze-muted pt-1 shrink-0 w-6">
                    0{i + 1}
                  </span>
                  <div className="flex-1">
                    <h3
                      className={`heading-lg transition-colors duration-300 ${
                        active === i ? 'text-maze-lime' : 'text-maze-cream'
                      }`}
                    >
                      {service.title}
                    </h3>

                    <AnimatePresence>
                      {active === i && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.35, ease: [0.19, 1, 0.22, 1] }}
                          className="overflow-hidden"
                        >
                          <p className="body-lg text-maze-muted mt-3 max-w-xl">
                            {service.description}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-4">
                            {service.tags.map((tag) => (
                              <span
                                key={tag}
                                className="label-sm px-3 py-1 border border-maze-border rounded-full text-maze-muted"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Arrow */}
                <Link
                  href={SERVICE_HREFS[i] ?? '/services'}
                  className={`shrink-0 w-10 h-10 rounded-full border flex items-center justify-center transition-all duration-300 ${
                    active === i
                      ? 'border-maze-lime text-maze-lime rotate-0'
                      : 'border-maze-border text-maze-muted -rotate-45'
                  }`}
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
