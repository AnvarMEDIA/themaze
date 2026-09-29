'use client'

import { useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface Props {
  children: React.ReactNode
  className?: string
  strength?: number
}

export function MagneticButton({ children, className, strength = 0.3 }: Props) {
  const ref              = useRef<HTMLDivElement>(null)
  const [pos, setPos]    = useState({ x: 0, y: 0 })
  const shouldReduce     = useReducedMotion()

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current || shouldReduce) return
    const rect = ref.current.getBoundingClientRect()
    setPos({
      x: (e.clientX - rect.left - rect.width  / 2) * strength,
      y: (e.clientY - rect.top  - rect.height / 2) * strength,
    })
  }

  const handleMouseLeave = () => setPos({ x: 0, y: 0 })

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      // Use full transform string for hardware acceleration (Emil's rule)
      animate={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
      // Apple-style spring: easier to reason about, subtle bounce
      transition={{ type: 'spring', duration: 0.4, bounce: 0.15 }}
      className={cn('inline-block', className)}
    >
      {children}
    </motion.div>
  )
}
