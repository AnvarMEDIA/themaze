'use client'

import { useRef } from 'react'
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
  const ref           = useRef<HTMLSpanElement>(null)
  const inView        = useInView(ref, { once, margin: '-10% 0px' })
  const shouldReduce  = useReducedMotion()

  // Emil: never animate from scale(0) / extreme positions if reduced motion
  const initial = shouldReduce ? { y: 0, opacity: 0 } : { y: '110%' }
  const animate = inView
    ? (shouldReduce ? { y: 0, opacity: 1 } : { y: '0%' })
    : initial

  if (stagger) {
    const words = children.split(' ')
    return (
      <Tag className={cn('overflow-hidden', className)} aria-label={children}>
        {words.map((word, i) => (
          <span key={i} className="inline-block overflow-hidden mr-[0.25em]">
            <motion.span
              className="inline-block"
              initial={shouldReduce ? { opacity: 0 } : { y: '110%' }}
              animate={inView
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

  return (
    <span className="inline-block overflow-hidden">
      <motion.span
        ref={ref}
        className={cn('inline-block', className)}
        initial={initial}
        animate={animate}
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
