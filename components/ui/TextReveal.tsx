'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { cn } from '@/lib/utils'

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
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once, margin: '-10% 0px' })

  if (stagger) {
    const words = children.split(' ')
    return (
      <Tag className={cn('overflow-hidden', className)} aria-label={children}>
        {words.map((word, i) => (
          <span key={i} className="inline-block overflow-hidden mr-[0.25em]">
            <motion.span
              className="inline-block"
              initial={{ y: '110%' }}
              animate={inView ? { y: '0%' } : { y: '110%' }}
              transition={{
                duration: 0.75,
                delay: delay + i * 0.06,
                ease: [0.19, 1, 0.22, 1],
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
        initial={{ y: '110%' }}
        animate={inView ? { y: '0%' } : { y: '110%' }}
        transition={{ duration: 0.8, delay, ease: [0.19, 1, 0.22, 1] }}
      >
        {children}
      </motion.span>
    </span>
  )
}
