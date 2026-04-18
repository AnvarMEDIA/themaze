'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import type { Partner } from '@/lib/partners'

interface Props {
  partners: Partner[]
  label:    string
  heading:  string
}

export function PartnersSection({ partners, label, heading }: Props) {
  const ref    = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, margin: '-10% 0px' })

  if (partners.length === 0) return null

  return (
    <section
      ref={ref}
      className="px-6 md:px-10 py-20 md:py-28 border-t border-maze-border overflow-hidden"
    >
      <div className="max-w-[1440px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-14">
          <div>
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5 }}
              className="label-sm text-maze-muted mb-3"
            >
              {label}
            </motion.p>
            <div className="overflow-hidden">
              <motion.h2
                initial={{ y: '100%' }}
                animate={inView ? { y: '0%' } : {}}
                transition={{ duration: 0.85, ease: [0.23, 1, 0.32, 1] }}
                className="heading-xl text-maze-cream"
              >
                {heading}
              </motion.h2>
            </div>
          </div>
        </div>

        {/* Logo grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px border border-maze-border rounded-2xl overflow-hidden bg-maze-border">
          {partners.map((partner, i) => (
            <motion.a
              key={partner.id}
              href={partner.url ?? '#'}
              target={partner.url ? '_blank' : undefined}
              rel="noopener noreferrer"
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 1 } : {}}
              transition={{ delay: 0.1 + i * 0.06, duration: 0.5 }}
              className="group relative flex items-center justify-center bg-maze-black p-8 h-28 hover:bg-maze-dark transition-colors duration-300"
              aria-label={partner.name}
            >
              {partner.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={partner.logo}
                  alt={partner.name}
                  className="max-h-10 w-auto max-w-[120px] object-contain opacity-50 group-hover:opacity-100 transition-opacity duration-300 filter grayscale group-hover:grayscale-0"
                />
              ) : (
                <span className="text-maze-muted group-hover:text-maze-cream font-bold text-sm tracking-wide transition-colors duration-300 text-center leading-tight">
                  {partner.name}
                </span>
              )}
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  )
}
