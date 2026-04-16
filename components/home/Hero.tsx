'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { MagneticButton } from '@/components/ui/MagneticButton'

const STATS = [
  { value: '200+', label: 'Projects' },
  { value: '80+',  label: 'Clients'  },
  { value: '6+',   label: 'Years'    },
  { value: '12',   label: 'Awards'   },
]

export function Hero() {
  const t          = useTranslations('hero')
  const words      = t.raw('words') as string[]
  const shouldReduce = useReducedMotion()
  const [wordIndex, setWordIndex] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setWordIndex(i => (i + 1) % words.length), 2500)
    return () => clearInterval(id)
  }, [words.length])

  const up = (delay: number) => ({
    initial:    shouldReduce ? { opacity: 0 } : { opacity: 0, y: 32 },
    animate:    { opacity: 1, y: 0 },
    transition: { delay, duration: 0.7, ease: [0.23, 1, 0.32, 1] as const },
  })

  return (
    <section className="relative min-h-screen flex flex-col overflow-hidden">

      {/* ── Background ──────────────────────────────────────────── */}
      <div aria-hidden className="absolute inset-0 pointer-events-none select-none">
        {/* Dot grid — fades out at edges */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:  'radial-gradient(circle, rgba(200,255,71,0.35) 1px, transparent 1px)',
            backgroundSize:   '36px 36px',
            maskImage:        'radial-gradient(ellipse 75% 65% at 50% 50%, black 0%, transparent 100%)',
            WebkitMaskImage:  'radial-gradient(ellipse 75% 65% at 50% 50%, black 0%, transparent 100%)',
          }}
        />
        {/* Ambient lime glow — top right */}
        <div
          className="absolute -top-40 -right-40 w-[700px] h-[700px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(200,255,71,0.07) 0%, transparent 65%)' }}
        />
        {/* Ambient glow — bottom left */}
        <div
          className="absolute -bottom-20 -left-20 w-[500px] h-[500px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(200,255,71,0.04) 0%, transparent 65%)' }}
        />
      </div>

      {/* ── EST label ───────────────────────────────────────────── */}
      <motion.p
        {...up(1.5)}
        className="absolute top-28 right-10 label-sm text-maze-muted hidden lg:block"
      >
        {t('est')}
      </motion.p>

      {/* ── Main content ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col justify-center px-6 md:px-10 pt-24 pb-10 max-w-[1440px] mx-auto w-full">

        {/* Badge */}
        <motion.div {...up(0.05)} className="mb-10">
          <span className="inline-flex items-center gap-2.5 label-sm px-4 py-2 border border-maze-border rounded-full text-maze-muted">
            <span className="w-1.5 h-1.5 rounded-full bg-maze-lime shrink-0 animate-pulse" />
            Branding &amp; Design Studio — Tashkent
          </span>
        </motion.div>

        {/* Headline */}
        <div className="mb-10 space-y-1">
          <motion.h1 {...up(0.2)} className="display-xl font-black text-maze-cream">
            {t('line1')}
          </motion.h1>

          {/* Line 2 + rotating lime word */}
          <motion.div {...up(0.35)} className="flex flex-wrap items-baseline gap-x-4 gap-y-0">
            <span className="display-xl font-black text-maze-cream">{t('line2')}</span>

            {/* Word slot — AnimatePresence swaps the word */}
            <span className="relative inline-block" style={{ minWidth: '4ch' }}>
              <AnimatePresence mode="wait">
                <motion.span
                  key={wordIndex}
                  initial={shouldReduce ? { opacity: 0 } : { opacity: 0, y: '40%' }}
                  animate={{ opacity: 1, y: '0%' }}
                  exit={shouldReduce   ? { opacity: 0 } : { opacity: 0, y: '-30%' }}
                  transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                  className="display-xl font-black text-maze-lime inline-block"
                >
                  {words[wordIndex]}
                </motion.span>
              </AnimatePresence>
            </span>
          </motion.div>
        </div>

        {/* Subtitle + CTAs */}
        <motion.div
          {...up(0.55)}
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-8"
        >
          <p className="body-lg text-maze-muted max-w-sm leading-relaxed">
            {t('subtitle')}
          </p>

          <div className="flex items-center gap-4 shrink-0">
            <MagneticButton>
              <Link
                href="/portfolio"
                className="flex items-center gap-3 px-6 py-3.5 border border-maze-border rounded-full text-maze-cream hover:border-maze-lime hover:text-maze-lime transition-all duration-300 label-sm"
              >
                {t('viewWork')}
                <motion.span
                  animate={{ x: [0, 4, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                >
                  →
                </motion.span>
              </Link>
            </MagneticButton>
            <MagneticButton>
              <Link
                href="/contact"
                className="flex items-center gap-2 px-6 py-3.5 bg-maze-lime text-maze-ink rounded-full label-sm font-bold hover:bg-maze-paper transition-colors duration-200"
              >
                {t('startProject')} ↗
              </Link>
            </MagneticButton>
          </div>
        </motion.div>
      </div>

      {/* ── Stats strip ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.1, duration: 0.7 }}
        className="border-t border-maze-border"
      >
        <div className="max-w-[1440px] mx-auto px-6 md:px-10 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-0">
          {STATS.map(({ value, label }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 + i * 0.07, duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
              className="md:border-r md:last:border-r-0 border-maze-border md:px-8 first:pl-0"
            >
              <p className="display-md font-black text-maze-lime leading-none">{value}</p>
              <p className="label-sm text-maze-muted mt-2">{label}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ── Scroll cue ──────────────────────────────────────────── */}
      <motion.div
        className="absolute bottom-[calc(7rem+1px)] right-10 hidden lg:flex flex-col items-center gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8, duration: 0.6 }}
      >
        <motion.div
          className="w-px h-12 bg-maze-muted origin-top"
          animate={{ scaleY: [0, 1, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        />
        <span className="label-sm text-maze-muted [writing-mode:vertical-rl] tracking-widest">
          {t('scroll')}
        </span>
      </motion.div>

    </section>
  )
}
