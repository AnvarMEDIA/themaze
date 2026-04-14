'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { motion, useInView, AnimatePresence } from 'framer-motion'

const services = [
  {
    num: '01',
    title: 'Brand Identity',
    description:
      'Full visual identity systems — logo, colour, typography, imagery, and the rules that hold it all together.',
    tags: ['Logo Design', 'Colour System', 'Typography', 'Brand Book'],
    href: '/services#brand-identity',
  },
  {
    num: '02',
    title: 'Brand Strategy',
    description:
      'Positioning, naming, messaging and competitive differentiation. The thinking before the making.',
    tags: ['Positioning', 'Naming', 'Messaging', 'Competitor Analysis'],
    href: '/services#strategy',
  },
  {
    num: '03',
    title: 'UI / UX Design',
    description:
      'Digital products and interfaces that earn trust, reduce friction, and delight at every touchpoint.',
    tags: ['UX Research', 'Wireframing', 'UI Design', 'Design Systems'],
    href: '/services#ui-ux',
  },
  {
    num: '04',
    title: 'Print & Packaging',
    description:
      'From business cards to billboard campaigns — print communication with impact and craft.',
    tags: ['Packaging', 'Stationery', 'Editorial', 'Environmental'],
    href: '/services#print',
  },
  {
    num: '05',
    title: 'Motion Design',
    description:
      'Brand animations, intro videos, social content and motion guidelines that bring identity to life.',
    tags: ['Brand Animation', 'Social Content', 'Video', 'Motion Guide'],
    href: '/services#motion',
  },
  {
    num: '06',
    title: 'Art Direction',
    description:
      'Creative oversight for campaigns, photography, and content — ensuring visual consistency across channels.',
    tags: ['Photography Direction', 'Campaign', 'Content Strategy'],
    href: '/services#art-direction',
  },
]

export function ServicesSection() {
  const ref    = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, margin: '-10% 0px' })
  const [active, setActive] = useState<number | null>(null)

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
          What we do
        </motion.p>
        <div className="overflow-hidden">
          <motion.h2
            initial={{ y: '100%' }}
            animate={inView ? { y: '0%' } : {}}
            transition={{ duration: 0.9, ease: [0.19, 1, 0.22, 1] }}
            className="display-md text-maze-cream"
          >
            Services
          </motion.h2>
        </div>
      </div>

      {/* Service list */}
      <div className="border-t border-maze-border">
        {services.map((service, i) => (
          <motion.div
            key={service.num}
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
                    {service.num}
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
                  href={service.href}
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
