'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link, usePathname } from '@/i18n/navigation'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { LangToggle } from '@/components/ui/LangToggle'

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

  useEffect(() => { setMenuOpen(false) }, [pathname])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  return (
    <>
      <motion.header
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-500',
          scrolled
            ? 'py-4 bg-maze-black/90 backdrop-blur-md border-b border-maze-border'
            : 'py-6'
        )}
        animate={{ transform: hidden && !menuOpen ? 'translateY(-100%)' : 'translateY(0%)' }}
        transition={{ duration: shouldReduce ? 0 : 0.35, ease: [0.23, 1, 0.32, 1] }}
      >
        <nav className="flex items-center justify-between px-6 md:px-10 max-w-[1440px] mx-auto">
          {/* Logo */}
          <Link href="/" className="flex items-center group">
            <MazeLogo />
          </Link>

          {/* Desktop nav */}
          <ul className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={cn(
                    'text-sm font-medium tracking-wide transition-colors duration-200 hover:text-maze-lime',
                    pathname.startsWith(link.href)
                      ? 'text-maze-lime'
                      : 'text-maze-muted'
                  )}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          {/* Right side: lang toggle + CTA */}
          <div className="flex items-center gap-3">
            <LangToggle />

            <Link
              href="/contact"
              className="hidden lg:flex items-center gap-2 px-5 py-2.5 bg-maze-lime text-maze-ink text-sm font-semibold tracking-wide rounded-full hover:bg-maze-paper transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-maze-cream focus-visible:ring-offset-2 focus-visible:ring-offset-maze-black"
            >
              {t('startProject')}
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                <path d="M1 9L9 1M9 1H3M9 1V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </Link>

            {/* Hamburger */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="lg:hidden flex flex-col gap-1.5 p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-maze-lime rounded"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
            >
              <motion.span
                animate={menuOpen ? { rotate: 45, y: 6 } : { rotate: 0, y: 0 }}
                transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                className="block w-6 h-px bg-maze-cream origin-center transition-colors"
              />
              <motion.span
                animate={menuOpen ? { opacity: 0, x: -8 } : { opacity: 1, x: 0 }}
                transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
                className="block w-4 h-px bg-maze-cream"
              />
              <motion.span
                animate={menuOpen ? { rotate: -45, y: -6 } : { rotate: 0, y: 0 }}
                transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                className="block w-6 h-px bg-maze-cream origin-center"
              />
            </button>
          </div>
        </nav>
      </motion.header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, clipPath: 'inset(0 0 100% 0)' }}
            animate={{ opacity: 1, clipPath: 'inset(0 0 0% 0)' }}
            exit={{   opacity: 0, clipPath: 'inset(0 0 100% 0)' }}
            transition={{
              // Emil: enter can be longer, exit must be fast
              duration: shouldReduce ? 0 : (menuOpen ? 0.55 : 0.25),
              ease: [0.32, 0.72, 0, 1], // --ease-drawer
            }}
            id="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Main menu"
            className="fixed inset-0 z-40 bg-maze-dark flex flex-col justify-center px-8"
          >
            <ul className="space-y-2">
              {navLinks.map((link, i) => (
                <motion.li
                  key={link.href}
                  initial={{ opacity: 0, x: -40 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.08, duration: 0.5 }}
                >
                  <Link
                    href={link.href}
                    className="block text-5xl sm:text-7xl font-bold text-maze-cream hover:text-maze-lime transition-colors py-2"
                  >
                    {link.label}
                  </Link>
                </motion.li>
              ))}
            </ul>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-12 pt-8 border-t border-maze-border"
            >
              <Link
                href="/contact"
                className="inline-flex items-center gap-3 px-8 py-4 bg-maze-lime text-maze-ink font-bold rounded-full text-lg"
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

function MazeLogo() {
  return (
    <div className="relative h-14 w-[140px]" style={{ filter: 'brightness(0) invert(1)' }}>
      {/* SVG is served as-is (unoptimized) to avoid rasterisation of a vector. */}
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
