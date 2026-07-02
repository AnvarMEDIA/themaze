'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'

// Emil: strong ease-out for entering elements; ease-in-out for on-screen
// morphs (the image clip reveal below).
const EASE_OUT = [0.23, 1, 0.32, 1] as const
const EASE_IN_OUT = [0.77, 0, 0.175, 1] as const

/** Reveal shortly after mount if the intersection observer never fires, so
 *  content can never stay permanently hidden. inView still wins earlier. */
function useRevealTrigger(inView: boolean): boolean {
  const [fallback, setFallback] = useState(false)
  useEffect(() => {
    const id = setTimeout(() => setFallback(true), 500)
    return () => clearTimeout(id)
  }, [])
  return inView || fallback
}

interface RevealProps {
  children: React.ReactNode
  className?: string
  /** Extra delay (s) — combine with an index for staggered lists. */
  delay?: number
  /** Travel distance in px (0 = fade only). */
  y?: number
  once?: boolean
}

/**
 * Fade-and-rise a block into view on scroll. GPU-only (opacity + y),
 * reduced-motion aware (fades without moving). Wrap section blocks or
 * map over list items with `delay={i * 0.06}` for a stagger.
 */
export function Reveal({ children, className, delay = 0, y = 22, once = true }: RevealProps) {
  const ref    = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once, margin: '-12% 0px' })
  const reduce = useReducedMotion()
  const show   = useRevealTrigger(inView)

  return (
    <motion.div
      ref={ref}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y }}
      animate={show ? { opacity: 1, y: 0 } : (reduce ? { opacity: 0 } : { opacity: 0, y })}
      transition={{ duration: reduce ? 0.2 : 0.6, delay, ease: EASE_OUT }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/**
 * Reveal an image by wiping a clip-path from bottom to top as it enters
 * the viewport (Emil's scroll-image-reveal pattern). The child should be
 * the sized image container.
 */
export function RevealImage({ children, className, delay = 0 }: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  const ref    = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-15% 0px' })
  const reduce = useReducedMotion()
  const show   = useRevealTrigger(inView)

  return (
    <motion.div
      ref={ref}
      initial={reduce ? { opacity: 0 } : { clipPath: 'inset(0 0 100% 0)' }}
      animate={show
        ? (reduce ? { opacity: 1 } : { clipPath: 'inset(0 0 0% 0)' })
        : (reduce ? { opacity: 0 } : { clipPath: 'inset(0 0 100% 0)' })}
      transition={{ duration: reduce ? 0.2 : 0.85, delay, ease: EASE_IN_OUT }}
      className={cn('will-change-[clip-path]', className)}
    >
      {children}
    </motion.div>
  )
}
