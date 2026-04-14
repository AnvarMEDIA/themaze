'use client'

import { useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { motion, useInView } from 'framer-motion'
import { MagneticButton } from '@/components/ui/MagneticButton'

export function CTASection() {
  const t      = useTranslations('cta')
  const ref    = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, margin: '-10% 0px' })

  return (
    <section
      ref={ref}
      className="px-6 md:px-10 py-28 md:py-44 border-t border-maze-border relative overflow-hidden"
    >
      {/* Background accent */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ duration: 1.5 }}
      >
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[120px]"
          style={{ background: 'radial-gradient(circle, rgba(200,255,71,0.06) 0%, transparent 70%)' }}
        />
      </motion.div>

      <div className="max-w-[1440px] mx-auto text-center relative z-10">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          className="label-sm text-maze-muted mb-8"
        >
          {t('label')}
        </motion.p>

        <div className="overflow-hidden mb-4">
          <motion.h2
            initial={{ y: '100%' }}
            animate={inView ? { y: '0%' } : {}}
            transition={{ duration: 1, ease: [0.19, 1, 0.22, 1] }}
            className="display-lg text-maze-cream"
          >
            {t('line1')}
          </motion.h2>
        </div>
        <div className="overflow-hidden mb-4">
          <motion.h2
            initial={{ y: '100%' }}
            animate={inView ? { y: '0%' } : {}}
            transition={{ delay: 0.08, duration: 1, ease: [0.19, 1, 0.22, 1] }}
            className="display-lg text-maze-lime"
          >
            {t('line2')}
          </motion.h2>
        </div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.3, duration: 0.7 }}
          className="body-lg text-maze-muted max-w-md mx-auto mt-6 mb-12"
        >
          {t('sub')}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.45 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <MagneticButton>
            <Link
              href="/contact"
              className="inline-flex items-center gap-3 px-8 py-4 bg-maze-lime text-maze-black font-bold rounded-full text-base hover:bg-white transition-colors duration-200"
            >
              {t('button')} ↗
            </Link>
          </MagneticButton>
          <MagneticButton>
            <a
              href={`mailto:${t('email')}`}
              className="inline-flex items-center gap-3 px-8 py-4 border border-maze-border text-maze-cream rounded-full text-base hover:border-maze-lime hover:text-maze-lime transition-all duration-300 label-sm"
            >
              {t('email')}
            </a>
          </MagneticButton>
        </motion.div>
      </div>
    </section>
  )
}
