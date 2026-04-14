'use client'

import { useRef } from 'react'
import { useTranslations } from 'next-intl'
import { motion, useInView } from 'framer-motion'

export function ProcessSection() {
  const t      = useTranslations('process')
  const ref    = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, margin: '-10% 0px' })

  const steps = t.raw('steps') as { title: string; body: string }[]

  return (
    <section
      ref={ref}
      className="px-6 md:px-10 py-24 md:py-36 border-t border-maze-border bg-maze-dark"
    >
      <div className="max-w-[1440px] mx-auto">
        {/* Header */}
        <div className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
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
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.3 }}
            className="body-lg text-maze-muted max-w-sm"
          >
            {t('sub')}
          </motion.p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0.5">
          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 40 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.1, duration: 0.7, ease: [0.19, 1, 0.22, 1] }}
              className="bg-maze-gray p-8 relative group hover:bg-maze-border transition-colors duration-300"
            >
              {i < steps.length - 1 && (
                <div className="absolute top-8 -right-px w-px h-8 bg-maze-border hidden lg:block" />
              )}
              <span className="label-sm text-maze-lime mb-6 block">
                0{i + 1}
              </span>
              <h3 className="heading-md text-maze-cream mb-3 group-hover:text-maze-lime transition-colors">
                {step.title}
              </h3>
              <p className="body-lg text-maze-muted">{step.body}</p>
              <div className="absolute bottom-6 right-6 w-2 h-2 rounded-full bg-maze-border group-hover:bg-maze-lime transition-colors duration-300" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
