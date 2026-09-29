'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link, usePathname } from '@/i18n/navigation'
import { motion, AnimatePresence, useReducedMotion, useScroll, useSpring } from 'framer-motion'
import { cn } from '@/lib/utils'
import { LangToggle } from '@/components/ui/LangToggle'

const EASE_OUT = [0.23, 1, 0.32, 1] as const

export function Navbar() {
  const t             = useTranslations('nav')
  const pathname      = usePathname()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [hidden, setHidden]     = useState(false)
  const prevY         = useRef(0)
  const shouldReduce  = useReducedMotion()

  // Smoothed scroll progress 0..1 — drives the lime line at the bottom of the bar.
  const { scrollYProgress } = useScroll()
  const progressX = useSpring(scrollYProgress, { stiffness: 280, damping: 40, mass: 0.6 })

  const navLinks = [
    { href: '/portfolio', label: t('work') },
    { href: '/services',  label: t('services') },
    { href: '/insights',  label: t('insights') },
    { href: '/about',     label: t('about') },
    { href: '/contact',   label: t('contact') },
  ]

  // Match the deepest segment so /portfolio/[slug] still highlights "Work".
  const activeHref = [...navLinks]
    .sort((a, b) => b.href.length - a.href.length)
    .find((l) => pathname === l.href || pathname.startsWith(l.href + '/'))
    ?.href ?? null

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      setScrolled(y > 40)
      setHidden(y > prevY.current && y > 120)
      prevY.current = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close menu on route change.
  useEffect(() => { setMenuOpen(false) }, [pathname])

  // Lock body scroll while menu is open.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  // ESC closes the mobile menu (helpful for keyboard users on tablets).
  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  return (
    <>
      <motion.header
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-[padding,background-color,border-color,backdrop-filter] duration-500',
          scrolled
            ? 'py-3 bg-maze-black/80 backdrop-blur-xl border-b border-maze-border'
            : 'py-6 border-b border-transparent'
        )}
        animate={{ y: hidden && !menuOpen ? '-100%' : '0%' }}
        transition={{ duration: shouldReduce ? 0 : 0.35, ease: EASE_OUT }}
      >
        <nav className="flex items-center justify-between px-6 md:px-10 max-w-[1440px] mx-auto">
          {/* Logo */}
          <Link
            href="/"
            aria-label="MAZE Studio — home"
            className="flex items-center group rounded -m-1 p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-maze-lime"
          >
            <MazeLogo scrolled={scrolled} />
          </Link>

          {/* Desktop nav — animated active pill via layoutId */}
          <ul className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => {
              const active = activeHref === link.href
              return (
                <li key={link.href} className="relative">
                  <Link
                    href={link.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'relative inline-block px-3.5 py-2 rounded-full text-sm font-medium tracking-wide',
                      'transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-maze-lime',
                      active
                        ? 'text-maze-cream'
                        : 'text-maze-muted [@media(hover:hover)_and_(pointer:fine)]:hover:text-maze-cream'
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="nav-pill"
                        className="absolute inset-0 rounded-full border border-maze-border bg-maze-cream/[0.06]"
                        transition={{ duration: 0.32, ease: EASE_OUT }}
                        style={{ zIndex: -1 }}
                        aria-hidden="true"
                      />
                    )}
                    {link.label}
                  </Link>
                </li>
              )
            })}
          </ul>

          {/* Right side: lang toggle + CTA + hamburger */}
          <div className="flex items-center gap-3">
            <LangToggle />

            <Link
              href="/contact"
              className={cn(
                'hidden lg:inline-flex group/cta items-center gap-2 px-5 py-2.5 rounded-full',
                'bg-maze-lime text-maze-ink text-sm font-semibold tracking-wide',
                'hover:bg-maze-paper transition-colors duration-200',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-maze-cream focus-visible:ring-offset-2 focus-visible:ring-offset-maze-black',
              )}
            >
              <span>{t('startProject')}</span>
              <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                fill="none"
                aria-hidden="true"
                className="transition-transform duration-200 ease-out group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-0.5"
              >
                <path d="M1 9L9 1M9 1H3M9 1V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </Link>

            {/* Hamburger */}
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="lg:hidden flex flex-col gap-1.5 p-2 -m-2 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-maze-lime"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
            >
              <motion.span
                animate={menuOpen ? { rotate: 45, y: 6 } : { rotate: 0, y: 0 }}
                transition={{ duration: 0.2, ease: EASE_OUT }}
                className="block w-6 h-px bg-maze-cream origin-center"
              />
              <motion.span
                animate={menuOpen ? { opacity: 0, x: -8 } : { opacity: 1, x: 0 }}
                transition={{ duration: 0.15, ease: EASE_OUT }}
                className="block w-4 h-px bg-maze-cream"
              />
              <motion.span
                animate={menuOpen ? { rotate: -45, y: -6 } : { rotate: 0, y: 0 }}
                transition={{ duration: 0.2, ease: EASE_OUT }}
                className="block w-6 h-px bg-maze-cream origin-center"
              />
            </button>
          </div>
        </nav>

        {/* Scroll progress — only visible while header is in "scrolled" state */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-px bg-maze-lime origin-left transition-opacity duration-300"
          style={{ scaleX: progressX, opacity: scrolled ? 1 : 0 }}
          aria-hidden="true"
        />
      </motion.header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, clipPath: 'inset(0 0 100% 0)' }}
            animate={{ opacity: 1, clipPath: 'inset(0 0 0% 0)' }}
            exit={{   opacity: 0, clipPath: 'inset(0 0 100% 0)' }}
            transition={{
              // Enter is a touch slower; exit snaps back fast.
              duration: shouldReduce ? 0 : (menuOpen ? 0.55 : 0.25),
              ease: [0.32, 0.72, 0, 1], // --ease-drawer
            }}
            id="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Main menu"
            className="fixed inset-0 z-40 bg-maze-dark flex flex-col justify-between px-8 pt-28 pb-10 overflow-y-auto"
          >
            <ul className="space-y-1">
              {navLinks.map((link, i) => {
                const num    = String(i + 1).padStart(2, '0')
                const active = activeHref === link.href
                return (
                  <motion.li
                    key={link.href}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.12 + i * 0.06, duration: 0.5, ease: EASE_OUT }}
                  >
                    <Link
                      href={link.href}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'group/m flex items-baseline gap-5 py-2 transition-colors duration-200',
                        active ? 'text-maze-lime' : 'text-maze-cream hover:text-maze-lime',
                      )}
                    >
                      <span className="label-sm text-maze-muted shrink-0 tabular-nums w-7">{num}</span>
                      <span className="text-5xl sm:text-7xl font-bold leading-[0.95] tracking-tight">
                        {link.label}
                      </span>
                      <span
                        className={cn(
                          'h-px flex-1 self-end mb-3 bg-maze-border origin-right',
                          'transition-transform duration-300 ease-out',
                          active ? 'scale-x-100' : 'scale-x-0 group-hover/m:scale-x-100',
                        )}
                        aria-hidden="true"
                      />
                    </Link>
                  </motion.li>
                )
              })}
            </ul>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, duration: 0.5, ease: EASE_OUT }}
              className="mt-12 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 pt-8 border-t border-maze-border"
            >
              <div>
                <p className="label-sm text-maze-muted mb-2">Get in touch</p>
                <a
                  href="mailto:hello@maze.uz"
                  className="text-lg font-semibold text-maze-cream hover:text-maze-lime transition-colors"
                >
                  hello@maze.uz
                </a>
              </div>
              <Link
                href="/contact"
                className="inline-flex items-center gap-3 px-8 py-4 bg-maze-lime text-maze-ink font-bold rounded-full text-lg hover:bg-maze-paper transition-colors"
              >
                {t('startProject')} ↗
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function MazeLogo({ scrolled }: { scrolled: boolean }) {
  return (
    <div
      className="relative transition-[height,width] duration-300 ease-out"
      style={{
        height: scrolled ? '36px' : '52px',
        width:  scrolled ? '92px' : '136px',
        filter: 'brightness(0) invert(1)',
      }}
    >
      {/* SVG kept as <img> so the optimiser doesn't rasterise the vector. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="https://1jorjbbfajvf5rug.public.blob.vercel-storage.com/maze_logo.svg"
        alt="MAZE Studio"
        className="h-full w-auto object-contain"
        loading="eager"
        decoding="async"
      />
    </div>
  )
}
