'use client'

import { useRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

// Emil ease-out. Navigation happens often, so the route transition is
// deliberately fast and subtle — smoothness over spectacle. A `template`
// (not `layout`) re-mounts on every navigation, giving each page a clean
// enter animation without a fragile exit-animation router hack.
const EASE_OUT = [0.23, 1, 0.32, 1] as const

export default function Template({ children }: { children: React.ReactNode }) {
  const ref    = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()

  return (
    <motion.div
      ref={ref}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0.2 : 0.45, ease: EASE_OUT }}
      // Once the enter finishes, drop the transform so a descendant's
      // position: sticky / fixed (e.g. the portfolio case-study sidebar)
      // isn't trapped by this element becoming their containing block.
      onAnimationComplete={() => {
        if (ref.current) ref.current.style.transform = 'none'
      }}
    >
      {children}
    </motion.div>
  )
}
