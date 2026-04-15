'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link, usePathname } from '@/i18n/navigation'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { LangToggle } from '@/components/ui/LangToggle'
import { LiquidButton } from '@/components/ui/LiquidButton'

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
          'fixed top-0 left-0 right-0 z-50 px-6 md:px-10 transition-all duration-500',
          scrolled
            ? 'py-4 bg-maze-black/90 backdrop-blur-md border-b border-maze-border'
            : 'py-6'
        )}
        animate={{ transform: hidden && !menuOpen ? 'translateY(-100%)' : 'translateY(0%)' }}
        transition={{ duration: shouldReduce ? 0 : 0.35, ease: [0.23, 1, 0.32, 1] }}
      >
        <nav className="flex items-center justify-between max-w-[1440px] mx-auto">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <MazeLogo />
            <span className="label-sm text-maze-muted hidden sm:block">
              {t('brandingStudio')}
            </span>
          </Link>

          {/* Desktop nav */}
          <ul className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={cn(
                    'label-sm transition-colors duration-200 hover:text-maze-lime',
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

          {/* Right side: toggles + CTA */}
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <LangToggle />

            <div className="hidden lg:block">
              <LiquidButton href="/contact" variant="lime" size="sm">
                {t('startProject')} ↗
              </LiquidButton>
            </div>

            {/* Hamburger */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="lg:hidden flex flex-col gap-1.5 p-1"
              aria-label="Toggle menu"
            >
              <motion.span
                animate={menuOpen ? { rotate: 45, y: 6 } : { rotate: 0, y: 0 }}
                className="block w-6 h-px bg-maze-cream origin-center transition-colors"
              />
              <motion.span
                animate={menuOpen ? { opacity: 0, x: -8 } : { opacity: 1, x: 0 }}
                className="block w-4 h-px bg-maze-cream"
              />
              <motion.span
                animate={menuOpen ? { rotate: -45, y: -6 } : { rotate: 0, y: 0 }}
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
              <LiquidButton href="/contact" variant="lime" size="lg">
                {t('startProject')} ↗
              </LiquidButton>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function MazeLogo() {
  return (
    <svg width="60" height="24" viewBox="0 0 60 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <text
        x="0"
        y="20"
        fontFamily="var(--font-sans), sans-serif"
        fontSize="22"
        fontWeight="900"
        letterSpacing="-1"
        fill="currentColor"
        className="text-maze-cream"
      >
        MAZE
      </text>
    </svg>
  )
}
