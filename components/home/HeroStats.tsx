'use client'

import { motion, useReducedMotion } from 'framer-motion'
import type { LocalStat } from '@/lib/homeStats'

// Strong ease-out curve (Emil Kowalski)
const EASE_OUT = [0.23, 1, 0.32, 1] as const

/**
 * The strip of numbers at the bottom of the homepage's first screen. Its own
 * component, on props only, so the admin's "Numbers" page can show it as the
 * site does while it is being edited.
 */
export function HeroStats({ stats }: { stats: LocalStat[] }) {
  const shouldReduce = useReducedMotion()

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.1, duration: 0.7 }}
      className="border-t border-maze-border"
    >
      <div className="max-w-[1440px] mx-auto px-6 md:px-10 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-0">
        {stats.map(({ id, value, suffix, label }, i) => (
          <motion.div
            key={id}
            initial={shouldReduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay:    1.2 + i * 0.07,
              duration: 0.5,
              ease:     EASE_OUT,
            }}
            className="md:border-r md:last:border-r-0 border-maze-border md:px-8 first:pl-0"
          >
            <p className="display-md font-black text-maze-lime leading-none">{value}{suffix}</p>
            <p className="label-sm text-maze-muted mt-2">{label}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
