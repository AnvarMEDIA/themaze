'use client'

import { useEffect, useRef, useState } from 'react'
import { useInView } from 'framer-motion'

interface Props {
  end: number
  suffix?: string
  prefix?: string
  duration?: number
  className?: string
}

type Phase = 'pending' | 'primed' | 'counting' | 'static'

/**
 * A number that counts up from zero as it comes into view.
 *
 * The number in the page is always the real one ("200+"): it is what the
 * server sends, what search engines index, what screen readers read and
 * what prints. The count-up is drawn over it (.counter in app/globals.css)
 * while the real digits are see-through, so the box keeps its final width
 * and nothing shifts as the digits grow.
 *
 *   pending   as rendered, hidden until the script decides, so a counter
 *             on screen at load counts from zero instead of showing its
 *             final value first. Without scripting it simply shows.
 *   primed    zero, waiting to come into view.
 *   counting  the count-up.
 *   static    the real number, plain: after counting, under
 *             prefers-reduced-motion, or if the stylesheet's safety
 *             timer showed it before the script ran.
 */
export function AnimatedCounter({
  end,
  suffix = '',
  prefix = '',
  duration = 1800,
  className,
}: Props) {
  const ref    = useRef<HTMLSpanElement>(null)
  const seen   = useInView(ref, { once: true, margin: '-10% 0px' })
  const [phase, setPhase] = useState<Phase>('pending')
  const [count, setCount] = useState(0)
  const target = useRef(end)
  target.current = end

  useEffect(() => {
    if (phase !== 'pending' || !ref.current) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    // The safety timer already showed the real number: counting from zero
    // now would make it flash.
    const shown  = getComputedStyle(ref.current).getPropertyValue('-webkit-text-fill-color') !== 'rgba(0, 0, 0, 0)'
    if (reduce || shown) {
      setPhase('static')
      return
    }
    setCount(0)
    setPhase('primed')
  }, [phase])

  useEffect(() => {
    if (phase === 'primed' && seen) setPhase('counting')
  }, [phase, seen])

  useEffect(() => {
    if (phase !== 'counting') return
    let raf   = 0
    let start = 0
    const step = (timestamp: number) => {
      if (!start) start = timestamp
      const progress = Math.min((timestamp - start) / duration, 1)
      // ease-out-cubic for natural deceleration
      const eased = 1 - Math.pow(1 - progress, 3)
      if (progress < 1) {
        setCount(Math.floor(eased * target.current))
        raf = requestAnimationFrame(step)
      } else {
        setPhase('static')
      }
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [phase, duration])

  const drawn = phase === 'primed' || phase === 'counting' ? `${prefix}${count}${suffix}` : undefined

  return (
    <span
      ref={ref}
      className={`counter ${className ?? ''}`}
      data-phase={phase}
      data-count={drawn}
    >
      {prefix}{end}{suffix}
    </span>
  )
}
