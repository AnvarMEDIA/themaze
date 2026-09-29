'use client'

import { useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import { MagneticButton } from '@/components/ui/MagneticButton'

// Strong ease-out curve (Emil Kowalski)
const EASE_OUT = [0.23, 1, 0.32, 1] as const
// Expressive ease for headline reveal
const EASE_EXPRESSIVE = [0.19, 1, 0.22, 1] as const

export function CTASection() {
  const t            = useTranslations('cta')
  const ref          = useRef<HTMLElement>(null)
  const inView       = useInView(ref, { once: true, margin: '-10% 0px' })
  const shouldReduce = useReducedMotion()

  return (
    <section
      ref={ref}
      className="px-6 md:px-10 py-28 md:py-44 border-t border-maze-border relative overflow-hidden"
    >
      {/* ── Subtle lime radial glow background ───────────────────── */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ duration: 1.5 }}
        aria-hidden
      >
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px]"
          style={{
            background: 'radial-gradient(circle, rgba(200,255,71,0.07) 0%, transparent 65%)',
          }}
        />
      </motion.div>

      {/* ── Centered content ─────────────────────────────────────── */}
      <div className="max-w-[1440px] mx-auto text-center relative z-10">

        {/* Label — "Ready to start?" */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease: EASE_OUT }}
          className="label-sm text-maze-muted mb-8"
        >
          {t('label')}
        </motion.p>

        {/* Line 1 — cream display-lg */}
        <div className="overflow-hidden mb-2">
          <motion.h2
            initial={shouldReduce ? { opacity: 0 } : { y: '100%' }}
            animate={inView ? { opacity: 1, y: '0%' } : {}}
            transition={{ duration: 1, ease: EASE_EXPRESSIVE }}
            className="display-lg text-maze-cream"
          >
            {t('line1')}
          </motion.h2>
        </div>

        {/* Line 2 — lime display-lg */}
        <div className="overflow-hidden mb-10">
          <motion.h2
            initial={shouldReduce ? { opacity: 0 } : { y: '100%' }}
            animate={inView ? { opacity: 1, y: '0%' } : {}}
            transition={{ delay: 0.08, duration: 1, ease: EASE_EXPRESSIVE }}
            className="display-lg text-maze-lime"
          >
            {t('line2')}
          </motion.h2>
        </div>

        {/* Short subtitle */}
        <motion.p
          initial={shouldReduce ? { opacity: 0 } : { opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.3, duration: 0.7, ease: EASE_OUT }}
          className="body-lg text-maze-muted max-w-md mx-auto mb-12"
        >
          {t('sub')}
        </motion.p>

        {/* CTA buttons — primary (lime) + secondary (border + email) */}
        <motion.div
          initial={shouldReduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.45, duration: 0.6, ease: EASE_OUT }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          {/* Primary — lime background */}
          <MagneticButton>
            <Link
              href="/contact"
              className="inline-flex items-center gap-3 px-8 py-4 bg-maze-lime text-maze-ink font-bold rounded-full label-sm active:scale-[0.97]"
              style={{ transition: 'background-color 200ms ease-out, transform 150ms ease-out' }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#F0EEE6' }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = '' }}
            >
              {t('button')} ↗
            </Link>
          </MagneticButton>

          {/* Secondary — border, shows email address */}
          <MagneticButton>
            <a
              href={`mailto:${t('email')}`}
              className="inline-flex items-center gap-3 px-8 py-4 border border-maze-border text-maze-cream rounded-full label-sm active:scale-[0.97]"
              style={{ transition: 'border-color 200ms ease-out, color 200ms ease-out, transform 150ms ease-out' }}
              onMouseEnter={e => {
                const el = e.currentTarget
                el.style.borderColor = 'rgb(var(--lime))'
                el.style.color = 'rgb(var(--lime))'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget
                el.style.borderColor = ''
                el.style.color = ''
              }}
            >
              {t('email')}
            </a>
          </MagneticButton>
        </motion.div>
      </div>
    </section>
  )
}
