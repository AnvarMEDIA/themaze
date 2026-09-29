'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'

// Emil: strong ease-out curve for text reveals
const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1]

interface Props {
  children: string
  className?: string
  delay?: number
  once?: boolean
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span'
  stagger?: boolean
}

export function TextReveal({
  children,
  className,
  delay = 0,
  once = true,
  as: Tag = 'span',
  stagger = false,
}: Props) {
  const ref          = useRef<HTMLElement>(null)
  const inView       = useInView(ref, { once, margin: '-10% 0px' })
  const shouldReduce = useReducedMotion()

  // Fail-safe: never leave the text permanently hidden if the intersection
  // observer doesn't fire (hydration edge cases, off-screen-on-mount, etc.).
  // Reveal shortly after mount; inView still wins earlier for the scroll effect.
  const [fallback, setFallback] = useState(false)
  useEffect(() => {
    const id = setTimeout(() => setFallback(true), 500)
    return () => clearTimeout(id)
  }, [])
  const show = inView || fallback

  if (stagger) {
    const words = children.split(' ')
    return (
      <Tag ref={ref as React.Ref<never>} className={cn('overflow-hidden', className)} aria-label={children}>
        {words.map((word, i) => (
          <span key={i} className="inline-block overflow-hidden mr-[0.25em]">
            <motion.span
              className="inline-block"
              initial={shouldReduce ? { opacity: 0 } : { y: '110%' }}
              animate={show
                ? (shouldReduce ? { opacity: 1 } : { y: '0%' })
                : (shouldReduce ? { opacity: 0 } : { y: '110%' })
              }
              transition={{
                duration: shouldReduce ? 0.2 : 0.7,
                // Emil: stagger 30–80ms per word
                delay: delay + i * 0.055,
                ease: EASE_OUT,
              }}
            >
              {word}
            </motion.span>
          </span>
        ))}
      </Tag>
    )
  }

  const initial = shouldReduce ? { y: 0, opacity: 0 } : { y: '110%' }
  return (
    <span className="inline-block overflow-hidden">
      <motion.span
        ref={ref as React.Ref<HTMLSpanElement>}
        className={cn('inline-block', className)}
        initial={initial}
        animate={show ? (shouldReduce ? { y: 0, opacity: 1 } : { y: '0%' }) : initial}
        transition={{
          duration: shouldReduce ? 0.2 : 0.8,
          delay,
          ease: EASE_OUT,
        }}
      >
        {children}
      </motion.span>
    </span>
  )
}
