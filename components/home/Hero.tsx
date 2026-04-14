'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import gsap from 'gsap'
import { MagneticButton } from '@/components/ui/MagneticButton'

const WORDS = ['BRANDS', 'IDEAS', 'FUTURES', 'STORIES']

export function Hero() {
  const wordRef      = useRef<HTMLSpanElement>(null)
  const wordIndex    = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // Cycling words animation
  useEffect(() => {
    if (!wordRef.current) return
    const el = wordRef.current

    const cycle = () => {
      wordIndex.current = (wordIndex.current + 1) % WORDS.length
      gsap.to(el, {
        y: '-100%',
        opacity: 0,
        duration: 0.4,
        ease: 'power2.in',
        onComplete: () => {
          el.textContent = WORDS[wordIndex.current]
          gsap.fromTo(
            el,
            { y: '100%', opacity: 0 },
            { y: '0%', opacity: 1, duration: 0.5, ease: 'power2.out' }
          )
        },
      })
    }

    const interval = setInterval(cycle, 2500)
    return () => clearInterval(interval)
  }, [])

  // Parallax on scroll
  useEffect(() => {
    if (!containerRef.current) return
    const el = containerRef.current

    const onScroll = () => {
      const y = window.scrollY
      el.style.transform = `translateY(${y * 0.25}px)`
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const charVariant = {
    hidden: { y: '110%' },
    visible: (i: number) => ({
      y: '0%',
      transition: { delay: 0.4 + i * 0.07, duration: 0.8, ease: [0.19, 1, 0.22, 1] },
    }),
  }

  const line1 = 'WE BUILD'
  const line2 = 'BOLD'

  return (
    <section className="relative min-h-screen flex flex-col justify-end pb-16 px-6 md:px-10 pt-28 overflow-hidden">
      {/* Background maze grid */}
      <div className="absolute inset-0 maze-grid opacity-30 pointer-events-none" />

      {/* Accent dot */}
      <motion.div
        className="absolute top-32 right-10 w-2 h-2 rounded-full bg-maze-lime"
        animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Year tag */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.4, duration: 0.6 }}
        className="absolute top-28 right-10 label-sm text-maze-muted hidden lg:block"
      >
        EST. 2017 — TASHKENT
      </motion.div>

      {/* Main headline */}
      <div ref={containerRef}>
        {/* Line 1 */}
        <div className="overflow-hidden">
          <div className="flex gap-[0.04em]" aria-label={line1}>
            {line1.split('').map((char, i) => (
              <motion.span
                key={i}
                className="display-xl inline-block font-black text-maze-cream"
                custom={i}
                initial="hidden"
                animate="visible"
                variants={charVariant}
                style={{ display: char === ' ' ? 'inline' : 'inline-block', width: char === ' ' ? '0.3em' : undefined }}
              >
                {char !== ' ' ? char : '\u00A0'}
              </motion.span>
            ))}
          </div>
        </div>

        {/* Line 2: BOLD + [cycling word] */}
        <div className="overflow-hidden flex flex-wrap items-end gap-x-[0.08em]">
          {line2.split('').map((char, i) => (
            <motion.span
              key={i}
              className="display-xl inline-block font-black text-maze-cream"
              custom={line1.length + i}
              initial="hidden"
              animate="visible"
              variants={charVariant}
            >
              {char}
            </motion.span>
          ))}
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.0 }}
            className="display-xl inline-block font-black overflow-hidden relative"
            style={{ minWidth: '4ch' }}
          >
            &nbsp;<span
              ref={wordRef}
              className="text-maze-lime inline-block"
            >
              {WORDS[0]}
            </span>
          </motion.span>
        </div>

        {/* Descriptor row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.7, ease: [0.19, 1, 0.22, 1] }}
          className="mt-8 flex flex-col sm:flex-row sm:items-end justify-between gap-6"
        >
          <p className="body-lg text-maze-muted max-w-sm">
            Branding &amp; Design Studio.<br />
            Crafting identities that lead markets.
          </p>

          <div className="flex items-center gap-4">
            <MagneticButton>
              <Link
                href="/portfolio"
                className="flex items-center gap-3 px-6 py-3.5 border border-maze-border rounded-full text-maze-cream hover:border-maze-lime hover:text-maze-lime transition-all duration-300 label-sm group"
              >
                View Work
                <motion.span
                  className="inline-block"
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
                className="flex items-center gap-2 px-6 py-3.5 bg-maze-lime text-maze-black rounded-full label-sm hover:bg-white transition-colors duration-200"
              >
                Start a Project ↗
              </Link>
            </MagneticButton>
          </div>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8, duration: 0.6 }}
      >
        <span className="label-sm text-maze-muted">Scroll</span>
        <motion.div
          className="w-px h-10 bg-maze-muted origin-top"
          animate={{ scaleY: [0, 1, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.div>
    </section>
  )
}
