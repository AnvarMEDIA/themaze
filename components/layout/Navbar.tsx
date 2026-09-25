'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link, usePathname } from '@/i18n/navigation'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { LangToggle } from '@/components/ui/LangToggle'
import { Arrow } from '@/components/ui/Arrow'

const EASE_OUT    = [0.23, 1, 0.32, 1] as const
const EASE_DRAWER = [0.32, 0.72, 0, 1] as const

/**
 * The header. It used to shrink on scroll — padding and logo size both
 * transitioning, which re-lays-out the bar on every frame of the change — and
 * carried a lime scroll-progress line and a sliding pill under the current
 * page. It now keeps one height, changes only its background once the page
 * moves, and marks the current page with a static underline.
 */
export function Navbar() {
  const t             = useTranslations('nav')
  const pathname      = usePathname()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [hidden, setHidden]     = useState(false)
  const prevY         = useRef(0)
  const shouldReduce  = useReducedMotion()

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
      <header
        className={cn(
          'fixed top-0 left-0 right-0 z-50 h-[76px] md:h-[84px] flex items-center border-b',
          // Sliding away is transform-only, on the compositor; the colour
          // change is the only other thing that moves.
          'transition-[transform,background-color,border-color] duration-200 ease-out',
          scrolled ? 'bg-maze-black/85 backdrop-blur-xl border-maze-border' : 'border-transparent',
        )}
        style={{ transform: hidden && !menuOpen ? 'translateY(-100%)' : 'translateY(0)' }}
      >
        <nav className="flex items-center justify-between w-full px-6 md:px-10 max-w-[1440px] mx-auto">
          <Link
            href="/"
            aria-label="MAZE Studio — home"
            className="flex items-center rounded -m-1 p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-maze-lime"
          >
            <MazeLogo />
          </Link>

          <ul className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => {
              const active = activeHref === link.href
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'inline-block px-3.5 py-2 text-sm font-medium tracking-wide rounded-sm',
                      'underline-offset-[10px] decoration-2',
                      'transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-maze-lime',
                      active
                        ? 'text-maze-cream underline decoration-maze-lime'
                        : 'text-maze-muted [@media(hover:hover)_and_(pointer:fine)]:hover:text-maze-cream'
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              )
            })}
          </ul>

          <div className="flex items-center gap-3">
            <LangToggle />

            <Link href="/contact" className="hidden lg:inline-flex btn btn-primary btn-sm">
              {t('startProject')}
              <Arrow direction="up-right" className="text-sm" />
            </Link>

            {/* Hamburger */}
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="lg:hidden flex flex-col gap-1.5 p-2 -m-2 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-maze-lime"
              aria-label={menuOpen ? t('closeMenu') : t('openMenu')}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
            >
              <motion.span
                animate={menuOpen ? { rotate: 45, y: 6 } : { rotate: 0, y: 0 }}
                transition={{ duration: 0.2, ease: EASE_OUT }}
                className="block w-6 h-px bg-maze-cream origin-center"
              />
              <motion.span
                animate={menuOpen ? { opacity: 0 } : { opacity: 1 }}
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
      </header>

      {/* Mobile menu. Opens like a drawer, closes faster than it opens. */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, clipPath: 'inset(0 0 100% 0)' }}
            animate={{ opacity: 1, clipPath: 'inset(0 0 0% 0)', transition: { duration: shouldReduce ? 0 : 0.4, ease: EASE_DRAWER } }}
            exit={{ opacity: 0, clipPath: 'inset(0 0 100% 0)', transition: { duration: shouldReduce ? 0 : 0.2, ease: EASE_OUT } }}
            id="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label={t('menu')}
            className="fixed inset-0 z-40 bg-maze-dark flex flex-col justify-between px-6 pt-28 pb-10 overflow-y-auto"
          >
            <ul>
              {navLinks.map((link, i) => {
                const active = activeHref === link.href
                return (
                  <motion.li
                    key={link.href}
                    initial={shouldReduce ? { opacity: 0 } : { opacity: 0, transform: 'translateY(12px)' }}
                    animate={{ opacity: 1, transform: 'translateY(0px)' }}
                    transition={{ delay: 0.08 + i * 0.04, duration: 0.3, ease: EASE_OUT }}
                    className="border-b border-maze-border"
                  >
                    <Link
                      href={link.href}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex items-center justify-between py-4 text-4xl sm:text-6xl font-bold leading-none tracking-tight transition-colors duration-200',
                        active ? 'text-maze-lime' : 'text-maze-cream',
                      )}
                    >
                      {link.label}
                      <Arrow direction="right" className="text-2xl text-maze-muted" />
                    </Link>
                  </motion.li>
                )
              })}
            </ul>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.2 }}
              className="mt-12 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6"
            >
              <div>
                <p className="font-mono text-xs text-maze-muted mb-1">{t('getInTouch')}</p>
                <a
                  href="mailto:hello@maze.uz"
                  className="inline-block py-1 text-lg font-semibold text-maze-cream hover:text-maze-lime transition-colors"
                >
                  hello@maze.uz
                </a>
              </div>
              <Link href="/contact" className="btn btn-primary self-start">
                {t('startProject')}
                <Arrow direction="up-right" className="text-base" />
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function MazeLogo() {
  return (
    <div className="relative h-10 w-[104px]" style={{ filter: 'brightness(0) invert(1)' }}>
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
