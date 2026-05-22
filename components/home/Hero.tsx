'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { MagneticButton } from '@/components/ui/MagneticButton'

// Strong ease-out curve (Emil Kowalski)
const EASE_OUT = [0.23, 1, 0.32, 1] as const

export function Hero() {
  const t            = useTranslations('hero')
  const tAbout       = useTranslations('about')

  const STATS = [
    { value: '200+', label: tAbout('stats.projects')  },
    { value: '80+',  label: tAbout('stats.clients')   },
    { value: '6+',   label: tAbout('stats.years')     },
    { value: '5+',   label: tAbout('stats.countries') },
  ]
  const words        = t.raw('words') as string[]
  const shouldReduce = useReducedMotion()
  const [wordIndex, setWordIndex] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setWordIndex(i => (i + 1) % words.length), 2500)
    return () => clearInterval(id)
  }, [words.length])

  // Fade-up factory — skips y-motion when reduced-motion is preferred
  const fadeUp = (delay: number) => ({
    initial:    shouldReduce ? { opacity: 0 } : { opacity: 0, y: 28 },
    animate:    { opacity: 1, y: 0 },
    transition: { delay, duration: 0.7, ease: EASE_OUT },
  })

  return (
    <section className="relative min-h-screen flex flex-col overflow-hidden">

      {/* ── Background ───────────────────────────────────────────── */}
      <div aria-hidden className="absolute inset-0 pointer-events-none select-none">
        {/* CSS dot grid — radial-gradient dots, masked radially to fade edges */}
        <div
          className="absolute inset-0 opacity-[0.28]"
          style={{
            backgroundImage:  'radial-gradient(circle, rgba(200,255,71,0.38) 1px, transparent 1px)',
            backgroundSize:   '36px 36px',
            maskImage:        'radial-gradient(ellipse 72% 60% at 50% 48%, black 0%, transparent 100%)',
            WebkitMaskImage:  'radial-gradient(ellipse 72% 60% at 50% 48%, black 0%, transparent 100%)',
          }}
        />
        {/* Lime ambient glow — top-right, very low opacity ~0.06 */}
        <div
          className="absolute -top-48 -right-48 w-[760px] h-[760px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(200,255,71,0.06) 0%, transparent 65%)' }}
        />
        {/* Lime ambient glow — bottom-left, very low opacity ~0.06 */}
        <div
          className="absolute -bottom-32 -left-32 w-[560px] h-[560px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(200,255,71,0.06) 0%, transparent 65%)' }}
        />
      </div>

      {/* ── Main content ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col justify-center px-6 md:px-10 pt-28 pb-10 max-w-[1440px] mx-auto w-full">

        {/* Headline */}
        <div className="mb-10 space-y-1">
          {/* Line 1 — full row */}
          <motion.h1
            {...fadeUp(0.2)}
            className="display-lg font-black text-maze-cream leading-none"
          >
            {t('line1')}
          </motion.h1>

          {/* Line 2 + rotating lime word */}
          <motion.div
            {...fadeUp(0.35)}
            className="flex flex-wrap items-baseline gap-x-4 gap-y-0"
          >
            <span className="display-lg font-black text-maze-cream leading-none">
              {t('line2')}
            </span>

            {/* Rotating word slot — y-slide + opacity via AnimatePresence mode="wait" */}
            <span
              className="relative inline-block overflow-hidden pb-[0.15em]"
              style={{ minWidth: '4ch' }}
            >
              <AnimatePresence mode="wait">
                <motion.span
                  key={wordIndex}
                  initial={
                    shouldReduce
                      ? { opacity: 0 }
                      : { opacity: 0, y: '60%' }
                  }
                  animate={{ opacity: 1, y: '0%' }}
                  exit={
                    shouldReduce
                      ? { opacity: 0 }
                      : { opacity: 0, y: '-40%' }
                  }
                  transition={{ duration: 0.38, ease: EASE_OUT }}
                  className="display-lg font-black text-maze-lime inline-block leading-none"
                >
                  {words[wordIndex]}
                </motion.span>
              </AnimatePresence>
            </span>
          </motion.div>
        </div>

        {/* Subtitle (left-aligned) + CTAs (right-aligned) */}
        <motion.div
          {...fadeUp(0.55)}
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-8"
        >
          <p className="body-lg text-maze-muted max-w-sm leading-relaxed">
            {t('subtitle')}
          </p>

          <div className="flex items-center gap-4 shrink-0">
            {/* Ghost button */}
            <MagneticButton>
              <Link
                href="/portfolio"
                className="flex items-center gap-3 px-6 py-3.5 border border-maze-border rounded-full text-maze-cream label-sm active:scale-[0.97]"
                style={{
                  transition: 'color 200ms ease-out, border-color 200ms ease-out, transform 150ms ease-out',
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget
                  el.style.color = 'rgb(var(--lime))'
                  el.style.borderColor = 'rgb(var(--lime))'
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget
                  el.style.color = ''
                  el.style.borderColor = ''
                }}
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

            {/* Lime CTA button */}
            <MagneticButton>
              <Link
                href="/brief"
                className="flex items-center gap-2 px-6 py-3.5 bg-maze-lime text-maze-ink rounded-full label-sm font-bold active:scale-[0.97]"
                style={{ transition: 'background-color 200ms ease-out, transform 150ms ease-out' }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#F0EEE6' }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = '' }}
              >
                {t('fillBrief')} ↗
              </Link>
            </MagneticButton>
          </div>
        </motion.div>
      </div>

      {/* ── Stats strip — border-top, 4 stats in a row ───────────── */}
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
              initial={shouldReduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay:    1.2 + i * 0.07,
                duration: 0.5,
                ease:     EASE_OUT,
              }}
              className="md:border-r md:last:border-r-0 border-maze-border md:px-8 first:pl-0"
            >
              <p className="display-md font-black text-maze-lime leading-none">{value}</p>
              <p className="label-sm text-maze-muted mt-2">{label}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ── Scroll cue — vertical animated line, desktop only, right side ── */}
      <motion.div
        className="absolute bottom-[calc(7rem+1px)] right-10 hidden lg:flex flex-col items-center gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8, duration: 0.6 }}
        aria-hidden
      >
        <motion.div
          className="w-px h-12 bg-maze-muted origin-top"
          animate={shouldReduce ? {} : { scaleY: [0, 1, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          style={shouldReduce ? { opacity: 0.4 } : {}}
        />
        <span className="label-sm text-maze-muted [writing-mode:vertical-rl] tracking-widest">
          {t('scroll')}
        </span>
      </motion.div>

    </section>
  )
}
